package api

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"
)

func newTestClient(ip string) *Client {
	return &Client{send: make(chan []byte, 64), stop: make(chan bool), ip: ip}
}

// next returns the next message the client was sent whose action matches, skipping others.
func next(t *testing.T, c *Client, action string) map[string]any {
	t.Helper()
	deadline := time.After(2 * time.Second)
	for {
		select {
		case raw := <-c.send:
			var m map[string]any
			if err := json.Unmarshal(raw, &m); err != nil {
				t.Fatalf("bad message %s: %v", raw, err)
			}
			if m["action"] == action {
				return m
			}
		case <-deadline:
			t.Fatalf("no %q message arrived", action)
		}
	}
}

func hasMessage(c *Client, action string) bool {
	for {
		select {
		case raw := <-c.send:
			var m map[string]any
			if json.Unmarshal(raw, &m) == nil && m["action"] == action {
				return true
			}
		default:
			return false
		}
	}
}

func resetDeviceRuntime(t *testing.T) {
	t.Helper()
	pairAttemptLimiter = &creationLimiter{events: map[string][]time.Time{}}
	deviceRuntime.mu.Lock()
	deviceRuntime.conns = map[string]map[string]map[*Client]bool{}
	deviceRuntime.watchers = map[string]map[*Client]bool{}
	deviceRuntime.mu.Unlock()
}

type pairedTestDevice struct {
	id     string
	token  string
	client *Client
}

// host asks for a device with the roles, the device types the code in. Returns the live device connection.
func addTestDevice(t *testing.T, roomCode string, host *Client, name string, roles ...string) pairedTestDevice {
	t.Helper()
	for len(host.send) > 0 {
		<-host.send
	}
	data := map[string]any{"roles": roles}
	if ge := CreatePairing(host, &Event{Room: roomCode, Name: name, Data: data}); ge.code != "" {
		t.Fatalf("CreatePairing: %v", ge)
	}
	list := next(t, host, "devices")["data"].([]any)
	for len(host.send) > 0 { // the list is sent twice (watcher push and direct reply); both are the same
		<-host.send
	}
	var code string
	for _, item := range list {
		d := item.(map[string]any)
		if d["name"] == name {
			code, _ = d["code"].(string)
		}
	}
	if code == "" {
		t.Fatalf("host did not get a code for %s: %v", name, list)
	}
	device := newTestClient("10.0.0.5")
	if ge := PairDevice(device, &Event{Data: map[string]any{"code": strings.ToLower(code)}}); ge.code != "" {
		t.Fatalf("PairDevice: %v", ge)
	}
	paired := next(t, device, "device_paired")
	return pairedTestDevice{id: paired["id"].(string), token: paired["token"].(string), client: device}
}

func TestParsePairingCode(t *testing.T) {
	for _, in := range []string{"ABCD-K7P2", "abcd-k7p2", " abcd k7p2 ", "ABCDK7P2"} {
		room, suffix, ok := parsePairingCode(in)
		if !ok || room != "ABCD" || suffix != "K7P2" {
			t.Errorf("%q parsed as %q %q %v", in, room, suffix, ok)
		}
	}
	for _, in := range []string{"", "ABCD", "ABCD-K7P", "ABCD-K7P2X", "ABCD-K7P!"} {
		if _, _, ok := parsePairingCode(in); ok {
			t.Errorf("%q should not parse", in)
		}
	}
}

func TestNormalizeRoles(t *testing.T) {
	got := normalizeRoles([]string{"Lights", "tv", "tv", "admin", " buzzers "})
	want := []string{"tv", "buzzers", "lights"}
	if strings.Join(got, ",") != strings.Join(want, ",") {
		t.Fatalf("got %v, want %v", got, want)
	}
	if len(normalizeRoles([]string{"admin", "host"})) != 0 {
		t.Fatal("unknown roles must be dropped")
	}
}

func TestPairingCodeUsesNoLookAlikes(t *testing.T) {
	for i := 0; i < 200; i++ {
		suffix, err := randomFrom(pairingCodeAlphabet, pairingSuffixLength)
		if err != nil || len(suffix) != pairingSuffixLength || strings.ContainsAny(suffix, "01OI") {
			t.Fatalf("bad suffix %q (%v)", suffix, err)
		}
	}
}

func TestDevicePairingFlow(t *testing.T) {
	withMemoryStore(t)
	resetDeviceRuntime(t)
	newTestRoom(t, "FLOW", "host-pw")
	host := newTestClient("1.1.1.1")

	d := addTestDevice(t, "FLOW", host, "Stage TV", "tv")
	if len(d.token) < 32 {
		t.Fatalf("token too short: %q", d.token)
	}

	// The room remembers only a hash of the token.
	stored := store.loadDevices("FLOW")
	if len(stored) != 1 || stored[0].TokenHash == "" || strings.Contains(stored[0].TokenHash, d.token) || stored[0].Code != "" {
		t.Fatalf("unexpected stored device: %+v", stored)
	}

	// The same code cannot be used twice.
	again := newTestClient("10.0.0.6")
	code := formatPairingCode("FLOW", "AAAA")
	if ge := PairDevice(again, &Event{Data: map[string]any{"code": code}}); ge.code != PAIRING_INVALID {
		t.Fatalf("expected PAIRING_INVALID for a made-up code, got %q", ge.code)
	}

	// Reconnecting with the token works, with a wrong token or an unknown device it does not.
	conn := newTestClient("10.0.0.5")
	if ge := DeviceConnect(conn, &Event{Room: "FLOW", ID: d.id, Data: map[string]any{"token": d.token}}); ge.code != "" {
		t.Fatalf("DeviceConnect: %v", ge)
	}
	next(t, conn, "device_connected")
	next(t, conn, "data")
	if ge := DeviceConnect(newTestClient(""), &Event{Room: "FLOW", ID: d.id, Data: map[string]any{"token": "nope"}}); ge.code != UNAUTHENTICATED {
		t.Fatalf("wrong token: got %q", ge.code)
	}
	if ge := DeviceConnect(newTestClient(""), &Event{Room: "FLOW", ID: "nobody", Data: map[string]any{"token": d.token}}); ge.code != DEVICE_REVOKED {
		t.Fatalf("unknown device: got %q", ge.code)
	}
	if ge := DeviceConnect(newTestClient(""), &Event{Room: "FLOW", ID: d.id, Data: map[string]any{}}); ge.code != UNAUTHENTICATED {
		t.Fatalf("missing token: got %q", ge.code)
	}
}

func TestPairingCodeIsSingleUse(t *testing.T) {
	withMemoryStore(t)
	resetDeviceRuntime(t)
	newTestRoom(t, "ONCE", "host-pw")
	host := newTestClient("1.1.1.1")
	CreatePairing(host, &Event{Room: "ONCE", Name: "TV", Data: map[string]any{"roles": []string{"tv"}}})
	code := store.loadDevices("ONCE")[0].Code

	if ge := PairDevice(newTestClient("2.2.2.2"), &Event{Data: map[string]any{"code": code}}); ge.code != "" {
		t.Fatalf("first use: %v", ge)
	}
	if ge := PairDevice(newTestClient("3.3.3.3"), &Event{Data: map[string]any{"code": code}}); ge.code != PAIRING_INVALID {
		t.Fatalf("second use should fail, got %q", ge.code)
	}
}

func TestPairingCodeExpires(t *testing.T) {
	withMemoryStore(t)
	resetDeviceRuntime(t)
	newTestRoom(t, "OLDC", "host-pw")
	host := newTestClient("1.1.1.1")
	CreatePairing(host, &Event{Room: "OLDC", Name: "TV", Data: map[string]any{"roles": []string{"tv"}}})
	list := store.loadDevices("OLDC")
	code := list[0].Code
	list[0].CodeExpires = time.Now().Add(-time.Minute).UnixMilli()
	store.saveDevices("OLDC", list)

	if ge := PairDevice(newTestClient("2.2.2.2"), &Event{Data: map[string]any{"code": code}}); ge.code != PAIRING_EXPIRED {
		t.Fatalf("expected PAIRING_EXPIRED, got %q", ge.code)
	}
	// The host can ask for a fresh code for the same device.
	if ge := RefreshPairing(host, &Event{Room: "OLDC", ID: list[0].ID}); ge.code != "" {
		t.Fatalf("RefreshPairing: %v", ge)
	}
	fresh := store.loadDevices("OLDC")[0]
	if fresh.Code == "" || fresh.Code == code && fresh.CodeExpires <= time.Now().UnixMilli() {
		t.Fatalf("code was not refreshed: %+v", fresh)
	}
	if ge := PairDevice(newTestClient("2.2.2.2"), &Event{Data: map[string]any{"code": fresh.Code}}); ge.code != "" {
		t.Fatalf("pairing with the refreshed code: %v", ge)
	}
}

func TestPairingAttemptsAreRateLimited(t *testing.T) {
	withMemoryStore(t)
	resetDeviceRuntime(t)
	newTestRoom(t, "RATE", "host-pw")
	guesser := newTestClient("6.6.6.6")
	var last GameError
	for i := 0; i < pairAttemptLimit+3; i++ {
		last = PairDevice(guesser, &Event{Data: map[string]any{"code": "RATE-ZZZZ"}})
	}
	if last.code != PAIRING_RATE_LIMITED {
		t.Fatalf("expected rate limiting, got %q", last.code)
	}
	// Somebody else on another address is not affected.
	if ge := PairDevice(newTestClient("7.7.7.7"), &Event{Data: map[string]any{"code": "RATE-ZZZZ"}}); ge.code != PAIRING_INVALID {
		t.Fatalf("other address: got %q", ge.code)
	}
}

func TestSuccessfulPairingsDoNotCountTowardsTheLimit(t *testing.T) {
	withMemoryStore(t)
	resetDeviceRuntime(t)
	// A venue behind one address pairs many devices; addTestDevice pairs them all from 10.0.0.5.
	for _, room := range []string{"VNA1", "VNA2", "VNA3"} {
		newTestRoom(t, room, "host-pw")
		host := newTestClient("1.1.1.1")
		for i := 0; i < pairAttemptLimit/2; i++ {
			addTestDevice(t, room, host, fmt.Sprintf("Device %d", i), "lights")
		}
	}
	// Failures from that same address still add up.
	device := newTestClient("10.0.0.5")
	var last GameError
	for i := 0; i < pairAttemptLimit+1; i++ {
		last = PairDevice(device, &Event{Data: map[string]any{"code": "VNA1-ZZZZ"}})
	}
	if last.code != PAIRING_RATE_LIMITED {
		t.Fatalf("expected rate limiting after failures, got %q", last.code)
	}
}

func TestPairingWithAnUnknownRoomLooksLikeAWrongCode(t *testing.T) {
	withMemoryStore(t)
	resetDeviceRuntime(t)
	if ge := PairDevice(newTestClient("8.8.8.8"), &Event{Data: map[string]any{"code": "NOPE-AAAA"}}); ge.code != PAIRING_INVALID {
		t.Fatalf("got %q", ge.code)
	}
	if ge := PairDevice(newTestClient("8.8.8.9"), &Event{Data: map[string]any{"code": "x"}}); ge.code != PAIRING_INVALID {
		t.Fatalf("malformed: got %q", ge.code)
	}
}

func TestOnlyTheHostCanManageDevices(t *testing.T) {
	withMemoryStore(t)
	resetDeviceRuntime(t)
	newTestRoom(t, "BOSS", "host-pw")
	host := newTestClient("1.1.1.1")
	d := addTestDevice(t, "BOSS", host, "Buttons", "buzzers")

	for _, action := range []string{"create_pairing", "list_devices", "rename_device", "revoke_device", "refresh_pairing"} {
		// A stranger with no password.
		msg, _ := json.Marshal(map[string]any{"action": action, "room": "BOSS", "id": d.id, "name": "x", "data": map[string]any{"roles": []string{"tv"}}})
		if ge := EventPipe(newTestClient("9.9.9.9"), msg); ge.code != UNAUTHENTICATED {
			t.Errorf("%s without password: got %q", action, ge.code)
		}
		// A paired device itself is not the host either.
		if ge := EventPipe(d.client, msg); ge.code != UNAUTHENTICATED {
			t.Errorf("%s from a device: got %q", action, ge.code)
		}
	}
	if len(store.loadDevices("BOSS")) != 1 {
		t.Fatal("the device list must not have changed")
	}

	// With the host password it works.
	msg, _ := json.Marshal(map[string]any{"action": "rename_device", "room": "BOSS", "id": d.id, "name": "Big buttons", "hostPassword": "host-pw"})
	if ge := EventPipe(host, msg); ge.code != "" {
		t.Fatalf("host rename: %v", ge)
	}
	if got := store.loadDevices("BOSS")[0].Name; got != "Big buttons" {
		t.Fatalf("name = %q", got)
	}
}

func TestDeviceRolesLimitWhatADeviceMayDo(t *testing.T) {
	withMemoryStore(t)
	resetDeviceRuntime(t)
	newTestRoom(t, "ROLE", "host-pw")
	host := newTestClient("1.1.1.1")
	tv := addTestDevice(t, "ROLE", host, "TV", "tv")
	buttons := addTestDevice(t, "ROLE", host, "Buttons", "buzzers")
	lights := addTestDevice(t, "ROLE", host, "Lights", "lights")

	team := 0
	buzz := func(c *Client) GameError {
		msg, _ := json.Marshal(map[string]any{"action": "buzzer_screen_buzz", "room": "ROLE", "team": team})
		return EventPipe(c, msg)
	}
	if ge := buzz(tv.client); ge.code != UNAUTHENTICATED {
		t.Errorf("a TV must not buzz: %q", ge.code)
	}
	if ge := buzz(lights.client); ge.code != UNAUTHENTICATED {
		t.Errorf("lights must not buzz: %q", ge.code)
	}
	if ge := buzz(newTestClient("5.5.5.5")); ge.code != UNAUTHENTICATED {
		t.Errorf("a stranger must not buzz: %q", ge.code)
	}
	if ge := buzz(buttons.client); ge.code != "" {
		t.Errorf("a buzzer device must be able to buzz: %v", ge)
	}
	r, _ := store.getRoom(nil, "ROLE")
	if len(r.Game.Buzzed) != 1 || r.Game.Buzzed[0].Team == nil || *r.Game.Buzzed[0].Team != 0 {
		t.Fatalf("buzz not recorded: %+v", r.Game.Buzzed)
	}

	// A buzzer device may register its screen, but not run the game.
	reg, _ := json.Marshal(map[string]any{"action": "register_buzzer_screen", "room": "ROLE"})
	if ge := EventPipe(buttons.client, reg); ge.code != "" {
		t.Errorf("register_buzzer_screen: %v", ge)
	}
	for _, action := range []string{"data", "clearbuzzers", "resolve_buzz", "reveal", "timer_complete", "change_lang"} {
		msg, _ := json.Marshal(map[string]any{"action": action, "room": "ROLE"})
		for name, c := range map[string]*Client{"tv": tv.client, "buttons": buttons.client, "lights": lights.client} {
			if ge := EventPipe(c, msg); ge.code != UNAUTHENTICATED {
				t.Errorf("%s may not send %s: got %q", name, action, ge.code)
			}
		}
	}
}

func TestADeviceCannotUseAnotherRoomsRole(t *testing.T) {
	withMemoryStore(t)
	resetDeviceRuntime(t)
	newTestRoom(t, "ROM1", "pw1")
	newTestRoom(t, "ROM2", "pw2")
	host := newTestClient("1.1.1.1")
	buttons := addTestDevice(t, "ROM1", host, "Buttons", "buzzers")

	msg, _ := json.Marshal(map[string]any{"action": "buzzer_screen_buzz", "room": "ROM2", "team": 1})
	if ge := EventPipe(buttons.client, msg); ge.code != UNAUTHENTICATED {
		t.Fatalf("a device of ROM1 buzzed in ROM2: %q", ge.code)
	}
}

func TestRevokingADeviceDisconnectsItAndKeepsItOut(t *testing.T) {
	withMemoryStore(t)
	resetDeviceRuntime(t)
	newTestRoom(t, "GONE", "host-pw")
	host := newTestClient("1.1.1.1")
	buttons := addTestDevice(t, "GONE", host, "Buttons", "buzzers")
	// Drain what pairing sent so we only see what revoke sends.
	for len(host.send) > 0 {
		<-host.send
	}

	if ge := RevokeDevice(host, &Event{Room: "GONE", ID: buttons.id}); ge.code != "" {
		t.Fatalf("revoke: %v", ge)
	}
	next(t, buttons.client, "device_revoked")
	list := next(t, host, "devices")["data"].([]any)
	if len(list) != 0 {
		t.Fatalf("device still listed: %v", list)
	}

	// Its token no longer works, and its connection can no longer buzz.
	if ge := DeviceConnect(newTestClient(""), &Event{Room: "GONE", ID: buttons.id, Data: map[string]any{"token": buttons.token}}); ge.code != DEVICE_REVOKED {
		t.Fatalf("revoked token: got %q", ge.code)
	}
	msg, _ := json.Marshal(map[string]any{"action": "buzzer_screen_buzz", "room": "GONE", "team": 0})
	if ge := EventPipe(buttons.client, msg); ge.code != UNAUTHENTICATED {
		t.Fatalf("a revoked device can still buzz: %q", ge.code)
	}
	if ge := RevokeDevice(host, &Event{Room: "GONE", ID: "nobody"}); ge.code != DEVICE_NOT_FOUND {
		t.Fatalf("revoking an unknown device: %q", ge.code)
	}
}

func TestHostSeesDevicesGoOnlineAndOffline(t *testing.T) {
	withMemoryStore(t)
	resetDeviceRuntime(t)
	newTestRoom(t, "LIVE", "host-pw")
	host := newTestClient("1.1.1.1")
	ListDevices(host, &Event{Room: "LIVE"})
	next(t, host, "devices")

	d := addTestDevice(t, "LIVE", host, "TV", "tv")
	online := false
	deadline := time.After(2 * time.Second)
	for !online {
		select {
		case raw := <-host.send:
			var m struct {
				Action string       `json:"action"`
				Data   []deviceView `json:"data"`
			}
			if json.Unmarshal(raw, &m) == nil && m.Action == "devices" && len(m.Data) == 1 && m.Data[0].Connected {
				online = true
			}
		case <-deadline:
			t.Fatal("the host never saw the device come online")
		}
	}

	deviceClientClosed(d.client)
	offline := false
	deadline = time.After(2 * time.Second)
	for !offline {
		select {
		case raw := <-host.send:
			var m struct {
				Action string       `json:"action"`
				Data   []deviceView `json:"data"`
			}
			if json.Unmarshal(raw, &m) == nil && m.Action == "devices" && len(m.Data) == 1 && !m.Data[0].Connected && m.Data[0].Paired {
				offline = true
			}
		case <-deadline:
			t.Fatal("the host never saw the device go offline")
		}
	}
}

func TestDevicesAreNeverPartOfTheGameData(t *testing.T) {
	withMemoryStore(t)
	resetDeviceRuntime(t)
	r := newTestRoom(t, "SAFE", "host-pw")
	host := newTestClient("1.1.1.1")
	d := addTestDevice(t, "SAFE", host, "TV", "tv")

	gameJSON, _ := json.Marshal(r.Game)
	listJSON, _ := newSendDevices("SAFE", store.loadDevices("SAFE"))
	for name, blob := range map[string]string{"game": string(gameJSON), "device list": string(listJSON)} {
		if strings.Contains(blob, d.token) {
			t.Errorf("the token leaked into the %s", name)
		}
		if strings.Contains(blob, hashToken(d.token)) || strings.Contains(strings.ToLower(blob), "tokenhash") {
			t.Errorf("the token hash leaked into the %s", name)
		}
	}
}

func TestLockedRoomsStillLetPairedDevicesIn(t *testing.T) {
	withMemoryStore(t)
	resetDeviceRuntime(t)
	r := newTestRoom(t, "LOKD", "host-pw")
	host := newTestClient("1.1.1.1")
	d := addTestDevice(t, "LOKD", host, "TV", "tv")
	r.Game.Settings.LockJoining = true
	store.writeRoom("LOKD", r)

	if ge := JoinRoom(newTestClient("4.4.4.4"), &Event{Room: "LOKD", Name: "Troll"}); ge.code != ROOM_LOCKED {
		t.Fatalf("players must be kept out: %q", ge.code)
	}
	if ge := DeviceConnect(newTestClient("4.4.4.5"), &Event{Room: "LOKD", ID: d.id, Data: map[string]any{"token": d.token}}); ge.code != "" {
		t.Fatalf("a paired device must still get in: %v", ge)
	}
}

func TestDeviceLimitAndNames(t *testing.T) {
	withMemoryStore(t)
	resetDeviceRuntime(t)
	newTestRoom(t, "MANY", "host-pw")
	host := newTestClient("1.1.1.1")
	for i := 0; i < maxDevicesPerRoom; i++ {
		if ge := CreatePairing(host, &Event{Room: "MANY", Data: map[string]any{"roles": []string{"tv"}}}); ge.code != "" {
			t.Fatalf("device %d: %v", i, ge)
		}
	}
	if ge := CreatePairing(host, &Event{Room: "MANY", Data: map[string]any{"roles": []string{"tv"}}}); ge.code != DEVICE_LIMIT {
		t.Fatalf("expected DEVICE_LIMIT, got %q", ge.code)
	}
	if ge := CreatePairing(host, &Event{Room: "MANY", Data: map[string]any{"roles": []string{"nonsense"}}}); ge.code != MISSING_INPUT {
		t.Fatalf("a device without a valid role: got %q", ge.code)
	}
	list := store.loadDevices("MANY")
	if list[0].Name != "Device 1" {
		t.Fatalf("default name = %q", list[0].Name)
	}
	if got := cleanDeviceName("   a   very very very very long device name   "); len([]rune(got)) > maxDeviceNameLength || strings.Contains(got, "  ") {
		t.Fatalf("name not cleaned: %q", got)
	}
}

func TestSQLiteStoreKeepsDevicesApartFromTheGame(t *testing.T) {
	dir := t.TempDir()
	t.Setenv("GAME_STORE_SQLITE_PATH", filepath.Join(dir, "devices.db"))
	sqlite, ge := NewSQLiteStore()
	if ge.code != "" {
		t.Fatalf("sqlite: %v", ge)
	}
	previous := store
	store = sqlite
	t.Cleanup(func() { store = previous })

	r := NewGame("DISK")
	r.HostPassword = "pw"
	r.Hub = NewHub()
	go r.Hub.run()
	t.Cleanup(func() { defer func() { _ = recover() }(); close(r.Hub.stop) })
	store.writeRoom("DISK", r)

	list := []device{{ID: "a", Name: "TV", Roles: []string{"tv"}, TokenHash: "h", PairedAt: 1}}
	if ge := store.saveDevices("DISK", list); ge.code != "" {
		t.Fatalf("saveDevices: %v", ge)
	}
	// Saving the game (every handler does) must not wipe the devices.
	room, _ := store.getRoom(nil, "DISK")
	room.Game.Round = 3
	store.writeRoom("DISK", room)
	got := store.loadDevices("DISK")
	if len(got) != 1 || got[0].ID != "a" || got[0].TokenHash != "h" {
		t.Fatalf("devices after a game save: %+v", got)
	}
	if ge := store.saveDevices("NONE", list); ge.code != ROOM_NOT_FOUND {
		t.Fatalf("saving for a missing room: %q", ge.code)
	}
	if len(store.loadDevices("NONE")) != 0 {
		t.Fatal("a missing room has no devices")
	}
	_ = os.Remove(filepath.Join(dir, "devices.db"))
}

func TestHostActionsTakeTheDeviceIdFromData(t *testing.T) {
	withMemoryStore(t)
	resetDeviceRuntime(t)
	newTestRoom(t, "DATA", "host-pw")
	host := newTestClient("1.1.1.1")
	d := addTestDevice(t, "DATA", host, "TV", "tv")

	// The console's own "id" is the host's player id; the device is named in data.deviceId.
	rename, _ := json.Marshal(map[string]any{"action": "rename_device", "room": "DATA", "id": "host-player-id", "name": "Lounge", "hostPassword": "host-pw", "data": map[string]any{"deviceId": d.id}})
	if ge := EventPipe(host, rename); ge.code != "" {
		t.Fatalf("rename: %v", ge)
	}
	if store.loadDevices("DATA")[0].Name != "Lounge" {
		t.Fatal("not renamed")
	}
	revoke, _ := json.Marshal(map[string]any{"action": "revoke_device", "room": "DATA", "id": "host-player-id", "hostPassword": "host-pw", "data": map[string]any{"deviceId": d.id}})
	if ge := EventPipe(host, revoke); ge.code != "" {
		t.Fatalf("revoke: %v", ge)
	}
	if len(store.loadDevices("DATA")) != 0 {
		t.Fatal("not revoked")
	}
}
