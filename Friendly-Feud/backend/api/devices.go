package api

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math/big"
	"sort"
	"strings"
	"sync"
	"time"
)

// Device hub: the host console can be on one computer while the TV board, the physical buzzer buttons and the
// lights run on other devices. The host adds a device (a name and what it is for), gets a short one-time code
// and enters it on that device. The device then keeps a secret token and reconnects with it; the token only
// allows what the device's roles allow, so it never carries the host's powers.
//
//	host console                                device
//	create_pairing {name, roles} -> devices
//	                                            pair_device {code}      -> device_paired {id, token}
//	                                            device_connect {id, token} -> device_connected
//	revoke_device {id} -> devices               (its sockets are closed after device_revoked)

const (
	roleTV      = "tv"
	roleBuzzers = "buzzers"
	roleLights  = "lights"

	pairingCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789" // no 0/O or 1/I look-alikes
	pairingSuffixLength = 4
	pairingCodeTTL      = 10 * time.Minute
	maxDevicesPerRoom   = 12
	maxDeviceNameLength = 24

	// Wrong, expired or guessed codes: this many failures per address in the window. Successful pairings do not
	// count, so a whole venue behind one address can connect its devices.
	pairAttemptLimit  = 20
	pairAttemptWindow = 10 * time.Minute
)

var deviceRoles = []string{roleTV, roleBuzzers, roleLights}

var pairAttemptLimiter = &creationLimiter{events: map[string][]time.Time{}}

// device is one paired (or waiting to be paired) screen or controller. Only the hash of its token is stored.
type device struct {
	ID    string   `json:"id"`
	Name  string   `json:"name"`
	Roles []string `json:"roles"`
	// Set while waiting to be paired, cleared once the device pairs.
	Code        string `json:"code,omitempty"`
	CodeExpires int64  `json:"codeExpires,omitempty"`
	// Hex SHA-256 of the device's token; empty until it has paired.
	TokenHash string `json:"tokenHash,omitempty"`
	PairedAt  int64  `json:"pairedAt,omitempty"`
}

func (d *device) paired() bool { return d.TokenHash != "" }

func (d *device) hasRole(role string) bool {
	for _, r := range d.Roles {
		if r == role {
			return true
		}
	}
	return false
}

// deviceView is what the host sees: never the token hash.
type deviceView struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	Roles       []string `json:"roles"`
	Paired      bool     `json:"paired"`
	Connected   bool     `json:"connected"`
	Code        string   `json:"code,omitempty"`
	CodeExpires int64    `json:"codeExpires,omitempty"`
	Expired     bool     `json:"expired,omitempty"`
}

// --- runtime connections (who is online right now) ---

var deviceRuntime = struct {
	mu sync.Mutex
	// room code -> device id -> live connections
	conns map[string]map[string]map[*Client]bool
	// room code -> host consoles that asked for the device list and want updates
	watchers map[string]map[*Client]bool
}{
	conns:    map[string]map[string]map[*Client]bool{},
	watchers: map[string]map[*Client]bool{},
}

// deviceMu serialises read-modify-write of a room's device list.
var deviceMu sync.Mutex

func markDeviceConnected(roomCode string, id string, c *Client) {
	deviceRuntime.mu.Lock()
	defer deviceRuntime.mu.Unlock()
	if deviceRuntime.conns[roomCode] == nil {
		deviceRuntime.conns[roomCode] = map[string]map[*Client]bool{}
	}
	if deviceRuntime.conns[roomCode][id] == nil {
		deviceRuntime.conns[roomCode][id] = map[*Client]bool{}
	}
	deviceRuntime.conns[roomCode][id][c] = true
}

func deviceIsConnected(roomCode string, id string) bool {
	deviceRuntime.mu.Lock()
	defer deviceRuntime.mu.Unlock()
	return len(deviceRuntime.conns[roomCode][id]) > 0
}

// dropDeviceClients forgets every live connection of a device and returns them.
func dropDeviceClients(roomCode string, id string) []*Client {
	deviceRuntime.mu.Lock()
	defer deviceRuntime.mu.Unlock()
	var out []*Client
	for c := range deviceRuntime.conns[roomCode][id] {
		out = append(out, c)
	}
	delete(deviceRuntime.conns[roomCode], id)
	return out
}

func addDeviceWatcher(roomCode string, c *Client) {
	deviceRuntime.mu.Lock()
	defer deviceRuntime.mu.Unlock()
	if deviceRuntime.watchers[roomCode] == nil {
		deviceRuntime.watchers[roomCode] = map[*Client]bool{}
	}
	deviceRuntime.watchers[roomCode][c] = true
}

func deviceWatchers(roomCode string) []*Client {
	deviceRuntime.mu.Lock()
	defer deviceRuntime.mu.Unlock()
	var out []*Client
	for c := range deviceRuntime.watchers[roomCode] {
		out = append(out, c)
	}
	return out
}

// deviceClientClosed is called when a websocket ends: the device goes offline and the host sees it.
func deviceClientClosed(c *Client) {
	if c == nil {
		return
	}
	deviceRuntime.mu.Lock()
	changedRoom := ""
	if c.deviceID != "" && deviceRuntime.conns[c.deviceRoom] != nil {
		if set := deviceRuntime.conns[c.deviceRoom][c.deviceID]; set != nil {
			delete(set, c)
			if len(set) == 0 {
				delete(deviceRuntime.conns[c.deviceRoom], c.deviceID)
				changedRoom = c.deviceRoom
			}
		}
	}
	for roomCode, set := range deviceRuntime.watchers {
		delete(set, c)
		if len(set) == 0 {
			delete(deviceRuntime.watchers, roomCode)
		}
	}
	deviceRuntime.mu.Unlock()
	if changedRoom != "" {
		pushDeviceList(changedRoom)
	}
}

// --- codes and tokens ---

func randomFrom(alphabet string, n int) (string, error) {
	out := make([]byte, n)
	max := big.NewInt(int64(len(alphabet)))
	for i := range out {
		v, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		out[i] = alphabet[v.Int64()]
	}
	return string(out), nil
}

func newDeviceToken() (string, error) {
	return randomFrom("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789", 40)
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func tokenMatches(d *device, token string) bool {
	if d == nil || !d.paired() || token == "" {
		return false
	}
	return subtle.ConstantTimeCompare([]byte(d.TokenHash), []byte(hashToken(token))) == 1
}

// formatPairingCode shows the room code and the one-time part as "ABCD-K7P2".
func formatPairingCode(roomCode string, suffix string) string {
	return roomCode + "-" + suffix
}

// parsePairingCode accepts "ABCD-K7P2", "abcd k7p2" or "ABCDK7P2".
func parsePairingCode(input string) (roomCode string, suffix string, ok bool) {
	var b strings.Builder
	for _, r := range strings.ToUpper(input) {
		if (r >= 'A' && r <= 'Z') || (r >= '0' && r <= '9') {
			b.WriteRune(r)
		}
	}
	code := b.String()
	if len(code) != roomLetterLength+pairingSuffixLength {
		return "", "", false
	}
	return code[:roomLetterLength], code[roomLetterLength:], true
}

func normalizeRoles(input []string) []string {
	seen := map[string]bool{}
	for _, r := range input {
		r = strings.ToLower(strings.TrimSpace(r))
		for _, allowed := range deviceRoles {
			if r == allowed {
				seen[r] = true
			}
		}
	}
	// Stable order, whatever order the host ticked them in.
	roles := []string{}
	for _, allowed := range deviceRoles {
		if seen[allowed] {
			roles = append(roles, allowed)
		}
	}
	return roles
}

func cleanDeviceName(name string) string {
	name = strings.Join(strings.Fields(name), " ")
	runes := []rune(name)
	if len(runes) > maxDeviceNameLength {
		name = string(runes[:maxDeviceNameLength])
	}
	return name
}

// --- the device list of a room ---

func loadDevicesOf(roomCode string) []device {
	return store.loadDevices(roomCode)
}

// changeDevices applies fn to a copy of the room's device list and saves it when fn returns no error.
func changeDevices(roomCode string, fn func(list []device) ([]device, error)) ([]device, error) {
	deviceMu.Lock()
	defer deviceMu.Unlock()
	list := loadDevicesOf(roomCode)
	next, err := fn(list)
	if err != nil {
		return list, err
	}
	if ge := store.saveDevices(roomCode, next); ge.code != "" {
		return list, fmt.Errorf("%s", ge.message)
	}
	return next, nil
}

func findDevice(list []device, id string) int {
	for i := range list {
		if list[i].ID == id {
			return i
		}
	}
	return -1
}

func deviceViews(roomCode string, list []device, now time.Time) []deviceView {
	views := make([]deviceView, 0, len(list))
	for _, d := range list {
		v := deviceView{ID: d.ID, Name: d.Name, Roles: d.Roles, Paired: d.paired()}
		if d.paired() {
			v.Connected = deviceIsConnected(roomCode, d.ID)
		} else {
			v.Code = d.Code
			v.CodeExpires = d.CodeExpires
			v.Expired = d.CodeExpires <= now.UnixMilli()
		}
		views = append(views, v)
	}
	sort.SliceStable(views, func(i, j int) bool { return views[i].Name < views[j].Name })
	return views
}

type sendDevices struct {
	Action string       `json:"action"`
	Data   []deviceView `json:"data"`
}

func newSendDevices(roomCode string, list []device) ([]byte, error) {
	return json.Marshal(sendDevices{Action: "devices", Data: deviceViews(roomCode, list, time.Now())})
}

// sendDeviceList answers one host console and keeps it up to date from now on.
func sendDeviceList(client *Client, roomCode string) GameError {
	addDeviceWatcher(roomCode, client)
	message, err := newSendDevices(roomCode, loadDevicesOf(roomCode))
	if err != nil {
		return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
	}
	client.send <- message
	return GameError{}
}

// pushDeviceList tells every host console that is watching the room about a change.
func pushDeviceList(roomCode string) {
	message, err := newSendDevices(roomCode, loadDevicesOf(roomCode))
	if err != nil {
		log.Println("could not encode device list", err)
		return
	}
	for _, c := range deviceWatchers(roomCode) {
		select {
		case c.send <- message:
		default:
		}
	}
}

// --- host actions ---

func eventDataMap(event *Event) map[string]any {
	if data, ok := event.Data.(map[string]any); ok {
		return data
	}
	return map[string]any{}
}

// targetDeviceID is the device a host action is about. The console puts it in data.deviceId because the "id" of
// every message it sends is the host's own player id.
func targetDeviceID(event *Event) string {
	if id, ok := eventDataMap(event)["deviceId"].(string); ok && id != "" {
		return id
	}
	return event.ID
}

func stringList(v any) []string {
	if direct, ok := v.([]string); ok {
		return direct
	}
	raw, ok := v.([]any)
	if !ok {
		return nil
	}
	out := make([]string, 0, len(raw))
	for _, item := range raw {
		if s, ok := item.(string); ok {
			out = append(out, s)
		}
	}
	return out
}

func newPairingCode(roomCode string, taken map[string]bool) (string, error) {
	for attempts := 0; attempts < 20; attempts++ {
		suffix, err := randomFrom(pairingCodeAlphabet, pairingSuffixLength)
		if err != nil {
			return "", err
		}
		if !taken[suffix] {
			return suffix, nil
		}
	}
	return "", fmt.Errorf("could not find a free pairing code")
}

func pendingSuffixes(roomCode string, list []device) map[string]bool {
	taken := map[string]bool{}
	for _, d := range list {
		if !d.paired() && len(d.Code) == roomLetterLength+1+pairingSuffixLength {
			taken[d.Code[len(d.Code)-pairingSuffixLength:]] = true
		}
	}
	return taken
}

// CreatePairing adds a device waiting for its code. Host only.
func CreatePairing(client *Client, event *Event) GameError {
	roomCode := event.Room
	data := eventDataMap(event)
	roles := normalizeRoles(stringList(data["roles"]))
	if len(roles) == 0 {
		return GameError{code: MISSING_INPUT, message: "role"}
	}
	name := cleanDeviceName(event.Name)

	_, err := changeDevices(roomCode, func(list []device) ([]device, error) {
		if len(list) >= maxDevicesPerRoom {
			return nil, fmt.Errorf("too many devices")
		}
		if name == "" {
			name = fmt.Sprintf("Device %d", len(list)+1)
		}
		suffix, err := newPairingCode(roomCode, pendingSuffixes(roomCode, list))
		if err != nil {
			return nil, err
		}
		return append(list, device{
			ID:          playerID(),
			Name:        name,
			Roles:       roles,
			Code:        formatPairingCode(roomCode, suffix),
			CodeExpires: time.Now().Add(pairingCodeTTL).UnixMilli(),
		}), nil
	})
	if err != nil {
		return GameError{code: DEVICE_LIMIT, message: err.Error()}
	}
	pushDeviceList(roomCode)
	return sendDeviceList(client, roomCode)
}

// RefreshPairing gives a waiting device a new code (for example after the old one expired). Host only.
func RefreshPairing(client *Client, event *Event) GameError {
	roomCode := event.Room
	_, err := changeDevices(roomCode, func(list []device) ([]device, error) {
		i := findDevice(list, targetDeviceID(event))
		if i < 0 || list[i].paired() {
			return nil, fmt.Errorf("no such waiting device")
		}
		suffix, err := newPairingCode(roomCode, pendingSuffixes(roomCode, list))
		if err != nil {
			return nil, err
		}
		list[i].Code = formatPairingCode(roomCode, suffix)
		list[i].CodeExpires = time.Now().Add(pairingCodeTTL).UnixMilli()
		return list, nil
	})
	if err != nil {
		return GameError{code: DEVICE_NOT_FOUND, message: err.Error()}
	}
	pushDeviceList(roomCode)
	return sendDeviceList(client, roomCode)
}

// ListDevices sends the device list to this host console and keeps sending changes. Host only.
func ListDevices(client *Client, event *Event) GameError {
	return sendDeviceList(client, event.Room)
}

// RenameDevice changes a device's name. Host only.
func RenameDevice(client *Client, event *Event) GameError {
	name := cleanDeviceName(event.Name)
	if name == "" {
		return GameError{code: MISSING_INPUT, message: "name"}
	}
	_, err := changeDevices(event.Room, func(list []device) ([]device, error) {
		i := findDevice(list, targetDeviceID(event))
		if i < 0 {
			return nil, fmt.Errorf("no such device")
		}
		list[i].Name = name
		return list, nil
	})
	if err != nil {
		return GameError{code: DEVICE_NOT_FOUND, message: err.Error()}
	}
	pushDeviceList(event.Room)
	return sendDeviceList(client, event.Room)
}

type sendDeviceRevoked struct {
	Action string `json:"action"`
}

// RevokeDevice removes a device and disconnects it at once. Host only.
func RevokeDevice(client *Client, event *Event) GameError {
	_, err := changeDevices(event.Room, func(list []device) ([]device, error) {
		i := findDevice(list, targetDeviceID(event))
		if i < 0 {
			return nil, fmt.Errorf("no such device")
		}
		return append(list[:i], list[i+1:]...), nil
	})
	if err != nil {
		return GameError{code: DEVICE_NOT_FOUND, message: err.Error()}
	}
	message, _ := json.Marshal(sendDeviceRevoked{Action: "device_revoked"})
	for _, c := range dropDeviceClients(event.Room, targetDeviceID(event)) {
		select {
		case c.send <- message:
		default:
		}
		// Give the message a moment to leave, then cut the line.
		go func(c *Client) {
			time.Sleep(300 * time.Millisecond)
			if c.conn != nil {
				c.conn.Close()
			}
		}(c)
	}
	pushDeviceList(event.Room)
	return sendDeviceList(client, event.Room)
}

// --- device actions ---

type sendDevicePaired struct {
	Action string   `json:"action"`
	Room   string   `json:"room"`
	ID     string   `json:"id"`
	Token  string   `json:"token"`
	Name   string   `json:"name"`
	Roles  []string `json:"roles"`
}

type sendDeviceConnected struct {
	Action string   `json:"action"`
	Room   string   `json:"room"`
	ID     string   `json:"id"`
	Name   string   `json:"name"`
	Roles  []string `json:"roles"`
}

// attachDevice makes this connection a device of the room: it receives everything the room broadcasts and may do
// what the device's roles allow, and the host console sees it as online.
func attachDevice(client *Client, r room, roomCode string, d device) GameError {
	client.deviceRoom = roomCode
	client.deviceID = d.ID
	markDeviceConnected(roomCode, d.ID, client)
	r.Hub.register <- client
	message, err := json.Marshal(sendDeviceConnected{Action: "device_connected", Room: roomCode, ID: d.ID, Name: d.Name, Roles: d.Roles})
	if err != nil {
		return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
	}
	client.send <- message
	message, err = NewSendData(r.Game)
	if err != nil {
		return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
	}
	client.send <- message
	pushDeviceList(roomCode)
	return GameError{}
}

// PairDevice exchanges a one-time code for a device token. Anyone may try, so failed attempts are rate limited.
func PairDevice(client *Client, event *Event) GameError {
	ip := ""
	if client != nil {
		ip = client.ip
	}
	if pairAttemptLimiter.blocked(ip, pairAttemptLimit, pairAttemptWindow, time.Now()) {
		return GameError{code: PAIRING_RATE_LIMITED, message: "Too many pairing attempts"}
	}
	ge := pairDeviceAttempt(client, event)
	if ge.code == PAIRING_INVALID || ge.code == PAIRING_EXPIRED {
		pairAttemptLimiter.record(ip, time.Now())
	}
	return ge
}

func pairDeviceAttempt(client *Client, event *Event) GameError {
	roomCode, suffix, ok := parsePairingCode(fmt.Sprint(eventDataMap(event)["code"]))
	if !ok {
		return GameError{code: PAIRING_INVALID, message: "Invalid pairing code"}
	}
	r, storeError := store.getRoom(client, roomCode)
	if storeError.code != "" {
		// A wrong room looks exactly like a wrong code.
		return GameError{code: PAIRING_INVALID, message: "Invalid pairing code"}
	}
	token, err := newDeviceToken()
	if err != nil {
		return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
	}
	want := formatPairingCode(roomCode, suffix)
	var paired device
	_, changeErr := changeDevices(roomCode, func(list []device) ([]device, error) {
		now := time.Now().UnixMilli()
		for i := range list {
			d := &list[i]
			if d.paired() || d.Code == "" {
				continue
			}
			if subtle.ConstantTimeCompare([]byte(d.Code), []byte(want)) != 1 {
				continue
			}
			if d.CodeExpires <= now {
				return nil, fmt.Errorf("expired")
			}
			d.TokenHash = hashToken(token)
			d.PairedAt = now
			d.Code = ""
			d.CodeExpires = 0
			paired = *d
			return list, nil
		}
		return nil, fmt.Errorf("invalid")
	})
	if changeErr != nil {
		if changeErr.Error() == "expired" {
			return GameError{code: PAIRING_EXPIRED, message: "This code has expired"}
		}
		return GameError{code: PAIRING_INVALID, message: "Invalid pairing code"}
	}
	message, err := json.Marshal(sendDevicePaired{Action: "device_paired", Room: roomCode, ID: paired.ID, Token: token, Name: paired.Name, Roles: paired.Roles})
	if err != nil {
		return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
	}
	client.send <- message
	return attachDevice(client, r, roomCode, paired)
}

// DeviceConnect signs a paired device back in with its token.
func DeviceConnect(client *Client, event *Event) GameError {
	r, storeError := store.getRoom(client, event.Room)
	if storeError.code != "" {
		return storeError
	}
	list := loadDevicesOf(event.Room)
	i := findDevice(list, targetDeviceID(event))
	token := fmt.Sprint(eventDataMap(event)["token"])
	if i < 0 {
		return GameError{code: DEVICE_REVOKED, message: "This device is no longer paired"}
	}
	if !tokenMatches(&list[i], token) {
		return GameError{code: UNAUTHENTICATED, message: "Unauthorized"}
	}
	return attachDevice(client, r, event.Room, list[i])
}

// deviceHasRole reports whether this connection belongs to a device of the room that still exists and has the role.
func deviceHasRole(client *Client, roomCode string, role string) bool {
	if client == nil || client.deviceID == "" || client.deviceRoom != roomCode {
		return false
	}
	list := loadDevicesOf(roomCode)
	i := findDevice(list, client.deviceID)
	return i >= 0 && list[i].paired() && list[i].hasRole(role)
}
