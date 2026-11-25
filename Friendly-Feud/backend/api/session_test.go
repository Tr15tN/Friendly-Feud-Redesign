package api

import (
	"testing"
	"time"
)

func TestInitalizeRoomAllowsNilClientForAdminReattach(t *testing.T) {
	room := InitalizeRoom(nil, "TEST")
	defer close(room.cleanup)
	defer func() {
		select {
		case room.Hub.stop <- true:
		case <-time.After(time.Second):
			t.Fatal("timed out stopping hub")
		}
	}()

	select {
	case room.Hub.broadcast <- []byte("admin reattach smoke test"):
	case <-time.After(time.Second):
		t.Fatal("timed out broadcasting after nil-client room initialization")
	}
}

func TestHostRoomRejectsCreationWhenPaused(t *testing.T) {
	setRoomCreationPaused(true)
	t.Cleanup(func() {
		setRoomCreationPaused(false)
	})

	gameError := HostRoom(nil, &Event{})

	if gameError.code != ROOM_CREATION_PAUSED {
		t.Fatalf("expected paused room creation error, got %q", gameError.code)
	}
}

func TestJoinRoomRefusesNewPlayersWhenTheHostLockedJoining(t *testing.T) {
	withMemoryStore(t)
	r := newTestRoom(t, "LOCK", "host-pw")
	r.Game.Settings.LockJoining = true
	store.writeRoom("LOCK", r)

	gameError := JoinRoom(&Client{}, &Event{Room: "LOCK", Name: "Troll"})
	if gameError.code != ROOM_LOCKED {
		t.Fatalf("expected ROOM_LOCKED, got %q", gameError.code)
	}
	stored, storeError := store.getRoom(&Client{}, "LOCK")
	if storeError.code != "" {
		t.Fatalf("getRoom: %v", storeError)
	}
	if len(stored.Game.RegisteredPlayers) != 0 {
		t.Fatalf("a refused player must not be registered: %+v", stored.Game.RegisteredPlayers)
	}
}
