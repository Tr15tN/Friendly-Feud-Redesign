package api

import (
	"fmt"
	"time"
)

// recordPadBuzz stores the first press of the single physical buzzer. The buzz has no team
// yet; the host says who was first with resolvePadBuzz. Returns false when a buzz already exists.
func (g *game) recordPadBuzz(nowMs int64) bool {
	if len(g.Buzzed) > 0 {
		return false
	}
	g.Buzzed = append(g.Buzzed, buzzed{Time: nowMs})
	return true
}

// hasPendingPadBuzz reports whether the first buzz is a physical-buzzer press waiting for a team.
func (g *game) hasPendingPadBuzz() bool {
	return len(g.Buzzed) > 0 && g.Buzzed[0].ID == "" && g.Buzzed[0].Team == nil
}

// resolvePadBuzz assigns the pending physical-buzzer press to team 0 or 1.
func (g *game) resolvePadBuzz(team int) bool {
	if team != 0 && team != 1 {
		return false
	}
	if !g.hasPendingPadBuzz() {
		return false
	}
	g.Buzzed[0].Team = &team
	return true
}

func ClearBuzzers(client *Client, event *Event) GameError {
	s := store
	room, storeError := s.getRoom(client, event.Room)
	if storeError.code != "" {
		return storeError
	}
	room.Game.Buzzed = []buzzed{}
	message, err := NewSendData(room.Game)
	if err != nil {
		return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
	}
	room.Hub.broadcast <- message
	message, err = NewSendClearBuzzers()
	if err != nil {
		return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
	}
	room.Hub.broadcast <- message
	s.writeRoom(room.Game.Room, room)
	return GameError{}
}

func RegisterBuzzer(client *Client, event *Event) GameError {
	s := store
	room, storeError := s.getRoom(client, event.Room)
	if storeError.code != "" {
		return storeError
	}
	if !clientOwnsID(&room, event.ID, client) {
		return GameError{code: FORBIDDEN}
	}
	// With a physical buzzer only the host's buzzer counts; ignore stray on-screen buzzes.
	if room.Game.Settings.PhysicalBuzzer {
		return GameError{}
	}
	player, ok := room.Game.RegisteredPlayers[event.ID]
	if !ok {
		return GameError{code: PLAYER_NOT_FOUND}
	}
	player.Team = event.Team
	player.Start = time.Now()
	message, err := NewSendPing(event.ID)
	if err != nil {
		return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
	}
	client.send <- message
	message, err = NewSendRegistered(event.ID)
	if err != nil {
		return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
	}
	client.send <- message
	message, err = NewSendData(room.Game)
	if err != nil {
		return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
	}
	room.Hub.broadcast <- message
	s.writeRoom(room.Game.Room, room)

	room.ensureMu()
	room.mu.RLock()
	clientPlayer, ok := room.registeredClients[event.ID]
	room.mu.RUnlock()
	if !ok {
		return GameError{code: PLAYER_NOT_FOUND}
	}
	// Set up recurring ping loop to get player latency
	go clientPlayer.pingInterval()
	s.writeRoom(room.Game.Room, room)
	return GameError{}
}

func RegisterBuzzerScreen(client *Client, event *Event) GameError {
	s := store
	room, storeError := s.getRoom(client, event.Room)
	if storeError.code != "" {
		return storeError
	}

	if event.HostPassword != room.HostPassword {
		return GameError{code: UNAUTHENTICATED, message: "Unauthorized"}
	}
	// Join the room's hub so this screen receives buzz and game updates even when it was
	// opened straight from a /buzzers?room=CODE link instead of through the join flow.
	room.Hub.register <- client
	message, err := NewSendRegisteredBuzzerScreen()
	if err != nil {
		return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
	}
	client.send <- message

	message, err = NewSendData(room.Game)
	if err != nil {
		return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
	}
	client.send <- message
	return GameError{}
}

func BuzzerScreenBuzz(client *Client, event *Event) GameError {
	s := store
	room, storeError := s.getRoom(client, event.Room)
	if storeError.code != "" {
		return storeError
	}
	if event.HostPassword != room.HostPassword {
		return GameError{code: UNAUTHENTICATED, message: "Unauthorized"}
	}

	// No team: the single physical buzzer. Keep only the first press until the host resolves it.
	if event.Team == nil {
		if room.Game.recordPadBuzz(time.Now().UTC().UnixMilli()) {
			return broadcastBuzz(s, event.Room, room)
		}
		return GameError{}
	}

	// Accept only the first buzz per team (host buzzers). If a player from that team
	// or a host buzz for that team already exists in this round, ignore
	alreadyBuzzedForTeam := false
	for _, bz := range room.Game.Buzzed {
		if bz.Team != nil && event.Team != nil && *bz.Team == *event.Team {
			alreadyBuzzedForTeam = true
			break
		}
		if bz.ID != "" {
			player, ok := room.Game.RegisteredPlayers[bz.ID]
			if ok && player.Team != nil && event.Team != nil && *player.Team == *event.Team {
				alreadyBuzzedForTeam = true
				break
			}
		}
	}
	if !alreadyBuzzedForTeam {
		room.Game.Buzzed = append(room.Game.Buzzed, buzzed{
			Time: time.Now().UTC().UnixMilli(),
			Team: event.Team,
		})
	}
	return broadcastBuzz(s, event.Room, room)
}

// broadcastBuzz tells every client a buzz happened, sends the new game state and saves the room.
func broadcastBuzz(s gameStore, roomCode string, room room) GameError {
	message, err := NewSendBuzzed()
	if err != nil {
		return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
	}
	room.Hub.broadcast <- message
	message, err = NewSendData(room.Game)
	if err != nil {
		return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
	}
	room.Hub.broadcast <- message
	s.writeRoom(roomCode, room)
	return GameError{}
}

// ResolveBuzz is the host answering "who was first?" for a physical-buzzer press.
func ResolveBuzz(client *Client, event *Event) GameError {
	s := store
	room, storeError := s.getRoom(client, event.Room)
	if storeError.code != "" {
		return storeError
	}
	if event.Team == nil || !room.Game.resolvePadBuzz(*event.Team) {
		return GameError{code: PARSE_ERROR, message: "no pending buzz or invalid team"}
	}
	message, err := NewSendData(room.Game)
	if err != nil {
		return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
	}
	room.Hub.broadcast <- message
	s.writeRoom(room.Game.Room, room)
	return GameError{}
}

func Buzz(client *Client, event *Event) GameError {
	s := store
	room, storeError := s.getRoom(client, event.Room)
	if storeError.code != "" {
		return storeError
	}
	if !clientOwnsID(&room, event.ID, client) {
		return GameError{code: FORBIDDEN}
	}
	player, ok := room.Game.RegisteredPlayers[event.ID]
	if !ok {
		return GameError{code: PLAYER_NOT_FOUND}
	}
	latency := time.Millisecond * time.Duration(player.Latency)
	latencyTime := time.Now().UTC().Add(-latency).UnixMilli()
	if len(room.Game.Buzzed) == 0 {
		room.Game.Buzzed = append(room.Game.Buzzed, buzzed{
			ID:   event.ID,
			Time: latencyTime,
		})
	} else {
		for idx, buz := range room.Game.Buzzed {
			if buz.Time < latencyTime {
				room.Game.Buzzed = append(room.Game.Buzzed, buzzed{
					ID:   event.ID,
					Time: latencyTime,
				})
				break
			}
			// Prepend to buzzed list since this buzzed was faster
			toAppend := []buzzed{{
				ID:   event.ID,
				Time: latencyTime,
			}}
			room.Game.Buzzed = append(toAppend, room.Game.Buzzed[idx+1:]...)
		}
	}
	message, err := NewSendBuzzed()
	if err != nil {
		return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
	}
	client.send <- message
	message, err = NewSendData(room.Game)
	if err != nil {
		return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
	}
	room.Hub.broadcast <- message
	s.writeRoom(event.Room, room)
	return GameError{}
}

func RegisterSpectator(client *Client, event *Event) GameError {
	s := store
	room, storeError := s.getRoom(client, event.Room)
	if storeError.code != "" {
		return storeError
	}
	// Only drop a registration that belongs to this connection. The id is only
	// removed when the caller actually owns it, so a client cannot kick others.
	if event.ID != "" {
		if !clientOwnsID(&room, event.ID, client) {
			return GameError{code: FORBIDDEN}
		}
		delete(room.Game.RegisteredPlayers, event.ID)
	}
	message, err := NewSendData(room.Game)
	if err != nil {
		return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
	}
	room.Hub.register <- client
	room.Hub.broadcast <- message
	return GameError{}
}
