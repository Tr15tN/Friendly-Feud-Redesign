package api

import (
	"testing"
)

// newTestRoom registers a room with a host password in the memory store and a
// drain goroutine on the hub so handlers that broadcast do not block.
func newTestRoom(t *testing.T, roomCode, hostPassword string) room {
	t.Helper()
	r := NewGame(roomCode)
	r.HostPassword = hostPassword
	r.Hub = NewHub()
	go r.Hub.run()
	// Drain broadcasts so the single-buffered hub never blocks in a test.
	go func() {
		for range r.Hub.broadcast {
		}
	}()
	t.Cleanup(func() {
		defer func() { _ = recover() }()
		close(r.Hub.stop)
	})
	store.writeRoom(roomCode, r)
	return r
}

func TestHostPasswordMatches(t *testing.T) {
	r := NewGame("ABCD")
	r.HostPassword = "s3cret-host-pw"
	cases := []struct {
		name     string
		provided string
		want     bool
	}{
		{"correct", "s3cret-host-pw", true},
		{"wrong", "nope", false},
		{"empty provided", "", false},
	}
	for _, c := range cases {
		if got := hostPasswordMatches(&r, c.provided); got != c.want {
			t.Errorf("%s: hostPasswordMatches = %v, want %v", c.name, got, c.want)
		}
	}

	// A room that was never hosted (no password) must never match, even for "".
	noHost := NewGame("WXYZ")
	if hostPasswordMatches(&noHost, "") {
		t.Error("room without a host password should not match an empty password")
	}
}

// A player (no host password) must not be able to overwrite game state.
func TestDataActionRequiresHostPassword(t *testing.T) {
	withMemoryStore(t)
	newTestRoom(t, "ROOM", "correct-pw")

	client := &Client{send: make(chan []byte, 8), stop: make(chan bool, 1)}
	payload := []byte(`{"action":"data","room":"ROOM","data":{"title_text":"PWNED"}}`)
	ge := EventPipe(client, payload)
	if ge.code != UNAUTHENTICATED {
		t.Fatalf("data without password: got %q, want %q", ge.code, UNAUTHENTICATED)
	}

	// Confirm the game state was not modified.
	r, _ := store.getRoom(client, "ROOM")
	if r.Game.TitleText == "PWNED" {
		t.Fatal("game state was overwritten without host authentication")
	}
}

// A correct host password passes the gate (handler is invoked).
func TestHostPasswordHandlerAllowsCorrectPassword(t *testing.T) {
	withMemoryStore(t)
	newTestRoom(t, "ROOM", "correct-pw")

	client := &Client{send: make(chan []byte, 8), stop: make(chan bool, 1)}
	called := false
	stub := func(c *Client, e *Event) GameError { called = true; return GameError{} }

	if ge := HostPasswordHandler(client, &Event{Room: "ROOM", HostPassword: "correct-pw"}, stub); ge.code != "" {
		t.Fatalf("correct password rejected: %q", ge.code)
	}
	if !called {
		t.Fatal("handler was not invoked for a correct host password")
	}

	called = false
	if ge := HostPasswordHandler(client, &Event{Room: "ROOM", HostPassword: "wrong"}, stub); ge.code != UNAUTHENTICATED {
		t.Fatalf("wrong password: got %q, want %q", ge.code, UNAUTHENTICATED)
	}
	if called {
		t.Fatal("handler ran despite a wrong host password")
	}
}

// Unknown/broadcast-only actions (reveal, mistake, timers) are host-only.
func TestUnknownActionRequiresHostPassword(t *testing.T) {
	withMemoryStore(t)
	newTestRoom(t, "ROOM", "correct-pw")

	client := &Client{send: make(chan []byte, 8), stop: make(chan bool, 1)}
	for _, action := range []string{"reveal", "mistake", "timer_complete", "final_reveal"} {
		payload := []byte(`{"action":"` + action + `","room":"ROOM"}`)
		if ge := EventPipe(client, payload); ge.code != UNAUTHENTICATED {
			t.Errorf("%s without password: got %q, want %q", action, ge.code, UNAUTHENTICATED)
		}
	}
}

// Tearing down a room (quit host:true) requires the host password.
func TestHostQuitRequiresPassword(t *testing.T) {
	withMemoryStore(t)
	newTestRoom(t, "ROOM", "correct-pw")

	client := &Client{send: make(chan []byte, 8), stop: make(chan bool, 1)}
	ge := Quit(client, &Event{Action: "quit", Host: true, Room: "ROOM"})
	if ge.code != UNAUTHENTICATED {
		t.Fatalf("host quit without password: got %q, want %q", ge.code, UNAUTHENTICATED)
	}
	// Room must still exist.
	if _, se := store.getRoom(client, "ROOM"); se.code != "" {
		t.Fatal("room was destroyed by an unauthenticated host quit")
	}
}

// load_game must refuse paths outside the games/ directory.
func TestLoadGameRejectsPathTraversal(t *testing.T) {
	withMemoryStore(t)
	newTestRoom(t, "ROOM", "correct-pw")

	client := &Client{send: make(chan []byte, 8), stop: make(chan bool, 1)}
	for _, p := range []string{"games/../../etc/passwd", "/etc/passwd", "../secrets.txt"} {
		ge := LoadGame(client, &Event{Room: "ROOM", File: p})
		if ge.code != FORBIDDEN {
			t.Errorf("load_game %q: got %q, want %q", p, ge.code, FORBIDDEN)
		}
	}
}

// clientOwnsID lets a connection act only on its own player id.
func TestClientOwnsID(t *testing.T) {
	r := NewGame("ROOM")
	owner := &Client{}
	other := &Client{}
	r.registeredClients["player-1"] = &RegisteredClient{id: "player-1", client: owner}

	if !clientOwnsID(&r, "player-1", owner) {
		t.Error("owner should be allowed to act on its own id")
	}
	if clientOwnsID(&r, "player-1", other) {
		t.Error("a different connection must not act on another player's id")
	}
	if clientOwnsID(&r, "unknown-id", owner) {
		t.Error("unknown id must not be owned by anyone")
	}
}
