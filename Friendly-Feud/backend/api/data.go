package api

import (
	"encoding/json"
	"fmt"
	"regexp"
	"time"
)

var teamColorPresets = map[string]bool{
	"red": true, "orange": true, "yellow": true, "green": true,
	"teal": true, "blue": true, "purple": true, "pink": true,
}

var teamColorHex = regexp.MustCompile(`^#[0-9a-fA-F]{6}$`)

// validTeamColor accepts "" (default), a preset id or "#rrggbb". The value is rendered
// into CSS variables by clients, so anything else is dropped.
func validTeamColor(c string) bool {
	return c == "" || teamColorPresets[c] || teamColorHex.MatchString(c)
}

func mergeGame(game *game, newData *game) {
	game.Round = newData.Round 
	game.Rounds = newData.Rounds
	game.FinalRound = newData.FinalRound
	game.FinalRound2 = newData.FinalRound2
	game.HideFirstRound = newData.HideFirstRound
	game.IsFinalRound = newData.IsFinalRound
	game.IsFinalSecond = newData.IsFinalSecond
	game.PointTracker = newData.PointTracker
	game.Settings = newData.Settings
	for i := range newData.Teams {
		if !validTeamColor(newData.Teams[i].Color) {
			newData.Teams[i].Color = ""
		}
	}
	game.Teams = newData.Teams
	game.Title = newData.Title
	game.TitleText = newData.TitleText
	game.RegisteredPlayers = newData.RegisteredPlayers
}

func NewData(client *Client, event *Event) GameError {
	s := store
	room, storeError := s.getRoom(client, event.Room)
	if storeError.code != "" {
		return storeError
	}
	copyRound := room.Game.Round
	copyTitle := room.Game.Title
	newData := game{}
	rawData, err := json.Marshal(event.Data)
	if err != nil {
		return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
	}
	err = json.Unmarshal(rawData, &newData)
	if err != nil {
		return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
	}
	mergeGame(room.Game, &newData)
	setTick(client, event)

	if copyRound != newData.Round || copyTitle != newData.Title {
		room.Game.Buzzed = []buzzed{}
		room.Game.RoundStartTime = time.Now().UTC().UnixMilli()
		message, err := NewSendClearBuzzers()
		if err != nil {
			return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
		}
		room.Hub.broadcast <- message
	}
	message, err := NewSendData(room.Game)
	if err != nil {
		return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
	}
	room.Hub.broadcast <- message
	s.writeRoom(event.Room, room)
	return GameError{}
}

func SendUnknown(client *Client, event *Event) GameError {
	s := store
	room, storeError := s.getRoom(client, event.Room)
	if storeError.code != "" {
		return storeError
	}
	message, err := json.Marshal(event)
	if err != nil {
		return GameError{code: SERVER_ERROR, message: fmt.Sprint(err)}
	}
	room.Hub.broadcast <- message
	return GameError{}
}
