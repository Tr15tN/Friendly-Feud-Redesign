package api

import "testing"

func intPtr(v int) *int { return &v }

func TestRecordPadBuzzKeepsOnlyTheFirstPress(t *testing.T) {
	g := &game{Buzzed: []buzzed{}}

	if !g.recordPadBuzz(1000) {
		t.Fatal("first press should be recorded")
	}
	if g.recordPadBuzz(1500) {
		t.Fatal("a second press must be ignored while a buzz is waiting")
	}
	if len(g.Buzzed) != 1 || g.Buzzed[0].Time != 1000 {
		t.Fatalf("expected exactly the first press, got %+v", g.Buzzed)
	}
	if !g.hasPendingPadBuzz() {
		t.Fatal("the press should be pending until the host picks a team")
	}
}

func TestRecordPadBuzzIgnoredWhenSomeoneAlreadyBuzzed(t *testing.T) {
	g := &game{Buzzed: []buzzed{{Time: 500, ID: "player-1"}}}
	if g.recordPadBuzz(1000) {
		t.Fatal("must not replace an existing buzz")
	}
	if len(g.Buzzed) != 1 {
		t.Fatalf("buzz list changed: %+v", g.Buzzed)
	}
}

func TestResolvePadBuzzAssignsTeamAndClearsPending(t *testing.T) {
	g := &game{Buzzed: []buzzed{}}
	g.recordPadBuzz(1000)

	if !g.resolvePadBuzz(1) {
		t.Fatal("pending buzz should resolve")
	}
	if g.Buzzed[0].Team == nil || *g.Buzzed[0].Team != 1 {
		t.Fatalf("expected team 1, got %+v", g.Buzzed[0])
	}
	if g.hasPendingPadBuzz() {
		t.Fatal("buzz is resolved, not pending")
	}
	if g.resolvePadBuzz(0) {
		t.Fatal("an already resolved buzz must not be re-assigned")
	}
}

func TestResolvePadBuzzRejectsInvalidTeamOrNothingPending(t *testing.T) {
	g := &game{Buzzed: []buzzed{}}
	if g.resolvePadBuzz(0) {
		t.Fatal("nothing pending")
	}
	g.recordPadBuzz(1000)
	if g.resolvePadBuzz(2) || g.resolvePadBuzz(-1) {
		t.Fatal("team must be 0 or 1")
	}
	if !g.hasPendingPadBuzz() {
		t.Fatal("invalid resolve must leave the buzz pending")
	}
}

func TestTeamButtonBuzzIsNotPending(t *testing.T) {
	g := &game{Buzzed: []buzzed{{Time: 1, Team: intPtr(0)}}}
	if g.hasPendingPadBuzz() {
		t.Fatal("a team buzz is already resolved")
	}
}
