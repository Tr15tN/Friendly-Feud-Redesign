package api

import (
	"encoding/json"
	"testing"
)

func TestMusicControlSurvivesRelay(t *testing.T) {
	raw := []byte(`{"action":"set_title_music_volume","room":"ABCD","volume":0}`)
	event, err := parseEvent(raw)
	if err != nil {
		t.Fatal(err)
	}
	if event.Volume == nil || *event.Volume != 0 {
		t.Fatalf("mute volume dropped: %#v", event.Volume)
	}

	out, err := json.Marshal(event)
	if err != nil {
		t.Fatal(err)
	}
	var again Event
	if err := json.Unmarshal(out, &again); err != nil {
		t.Fatal(err)
	}
	if again.Volume == nil || *again.Volume != 0 {
		t.Fatalf("mute volume dropped on relay: %s", out)
	}

	fade, err := parseEvent([]byte(`{"action":"fade_title_music","fade":"in","volume":0.4}`))
	if err != nil {
		t.Fatal(err)
	}
	if fade.Fade != "in" || fade.Volume == nil || *fade.Volume != 0.4 {
		t.Fatalf("fade fields dropped: %#v", fade)
	}
}
