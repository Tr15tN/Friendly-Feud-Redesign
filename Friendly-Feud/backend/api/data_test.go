package api

import (
	"encoding/json"
	"testing"
)

// The host sends the whole game as JSON; the server must keep the scoring fields
// (awarded_to, awarded_points, cleanup, final_round_win_threshold) when merging.
func TestMergeGameKeepsScoringFields(t *testing.T) {
	payload := []byte(`{
		"round": 0,
		"point_tracker": [86],
		"teams": [{"name":"Alpha","points":86,"mistakes":1},{"name":"Bravo","points":0,"mistakes":0}],
		"settings": {"theme":"default","final_round_win_threshold":150},
		"rounds": [{
			"question": "q",
			"multiply": 2,
			"awarded_to": 0,
			"awarded_points": 86,
			"answers": [
				{"ans":"a","pnt":43,"trig":true},
				{"ans":"b","pnt":20,"trig":true,"cleanup":true}
			]
		}, {
			"question": "q2",
			"multiply": 1,
			"awarded_to": null,
			"answers": [{"ans":"c","pnt":10,"trig":false}]
		}]
	}`)

	var incoming game
	if err := json.Unmarshal(payload, &incoming); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	current := &game{}
	mergeGame(current, &incoming)

	r0 := current.Rounds[0]
	if r0.AwardedTo == nil || *r0.AwardedTo != 0 {
		t.Fatalf("awarded_to lost: %v", r0.AwardedTo)
	}
	if r0.AwardedPoints != 86 {
		t.Fatalf("awarded_points = %d, want 86", r0.AwardedPoints)
	}
	if !r0.Answers[1].Cleanup || r0.Answers[0].Cleanup {
		t.Fatalf("cleanup flags wrong: %+v", r0.Answers)
	}
	if current.Rounds[1].AwardedTo != nil {
		t.Fatalf("unawarded round should stay nil")
	}
	if current.Settings.FinalRoundWinThreshold != 150 {
		t.Fatalf("threshold = %d, want 150", current.Settings.FinalRoundWinThreshold)
	}

	// Round-trips back out to clients with the same JSON keys.
	out, err := json.Marshal(current)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	var check map[string]any
	_ = json.Unmarshal(out, &check)
	rounds := check["rounds"].([]any)
	if v, ok := rounds[0].(map[string]any)["awarded_to"]; !ok || v.(float64) != 0 {
		t.Fatalf("awarded_to not serialised: %v", rounds[0])
	}
	if v, ok := rounds[1].(map[string]any)["awarded_to"]; !ok || v != nil {
		t.Fatalf("unawarded round should serialise awarded_to as null: %v", rounds[1])
	}
}

// Team colours are relayed to the TV and phones, but only preset ids / #rrggbb survive.
func TestMergeGameKeepsOnlyValidTeamColors(t *testing.T) {
	payload := []byte(`{"teams":[
		{"name":"A","points":0,"mistakes":0,"color":"blue"},
		{"name":"B","points":0,"mistakes":0,"color":"red;background:url(//evil)"}
	]}`)
	var incoming game
	if err := json.Unmarshal(payload, &incoming); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}
	current := &game{}
	mergeGame(current, &incoming)
	if current.Teams[0].Color != "blue" {
		t.Fatalf("preset colour lost: %q", current.Teams[0].Color)
	}
	if current.Teams[1].Color != "" {
		t.Fatalf("invalid colour kept: %q", current.Teams[1].Color)
	}
	for _, c := range []string{"#00ff7f", "#ABCDEF", "teal", ""} {
		if !validTeamColor(c) {
			t.Fatalf("%q should be valid", c)
		}
	}
	for _, c := range []string{"#fff", "#12345g", "rgb(0,0,0)", "red;", "#1234567"} {
		if validTeamColor(c) {
			t.Fatalf("%q should be invalid", c)
		}
	}
	out, _ := json.Marshal(current.Teams[1])
	if string(out) != `{"name":"B","points":0,"mistakes":0}` {
		t.Fatalf("empty colour should be omitted: %s", out)
	}
}
