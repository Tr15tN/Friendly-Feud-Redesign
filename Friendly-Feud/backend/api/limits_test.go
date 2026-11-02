package api

import (
	"net/http"
	"testing"
	"time"
)

func TestCreationLimiterBlocksAfterLimitAndRecoversAfterWindow(t *testing.T) {
	l := &creationLimiter{events: map[string][]time.Time{}}
	start := time.Date(2026, 1, 1, 12, 0, 0, 0, time.UTC)

	for i := 0; i < 3; i++ {
		if !l.allow("1.2.3.4", 3, time.Hour, start.Add(time.Duration(i)*time.Minute)) {
			t.Fatalf("attempt %d should be allowed", i+1)
		}
	}
	if l.allow("1.2.3.4", 3, time.Hour, start.Add(10*time.Minute)) {
		t.Fatal("fourth attempt within the window should be blocked")
	}
	if !l.allow("5.6.7.8", 3, time.Hour, start.Add(10*time.Minute)) {
		t.Fatal("a different IP must have its own budget")
	}
	if !l.allow("1.2.3.4", 3, time.Hour, start.Add(61*time.Minute)) {
		t.Fatal("attempts should be allowed again once the oldest has left the window")
	}
}

func TestCreationLimiterZeroLimitDisablesLimiting(t *testing.T) {
	l := &creationLimiter{events: map[string][]time.Time{}}
	now := time.Now()
	for i := 0; i < 100; i++ {
		if !l.allow("ip", 0, time.Hour, now) {
			t.Fatal("limit 0 must never block")
		}
	}
}

func TestCheckRoomCreationEnforcesRoomCap(t *testing.T) {
	t.Setenv("MAX_ROOMS", "2")
	t.Setenv("ROOM_CREATE_LIMIT_PER_HOUR", "")

	if err := checkRoomCreation("a", 1, time.Now()); err.code != "" {
		t.Fatalf("below the cap should pass, got %q", err.code)
	}
	if err := checkRoomCreation("a", 2, time.Now()); err.code != ROOM_LIMIT_REACHED {
		t.Fatalf("at the cap should be rejected with ROOM_LIMIT_REACHED, got %q", err.code)
	}
}

func TestCheckRoomCreationEnforcesRateLimit(t *testing.T) {
	t.Setenv("MAX_ROOMS", "")
	t.Setenv("ROOM_CREATE_LIMIT_PER_HOUR", "1")
	ip := "203.0.113.77"
	t.Cleanup(func() {
		roomCreationLimiter.mu.Lock()
		delete(roomCreationLimiter.events, ip)
		roomCreationLimiter.mu.Unlock()
	})

	if err := checkRoomCreation(ip, 0, time.Now()); err.code != "" {
		t.Fatalf("first creation should pass, got %q", err.code)
	}
	if err := checkRoomCreation(ip, 0, time.Now()); err.code != ROOM_CREATION_RATE_LIMITED {
		t.Fatalf("second creation should be rate limited, got %q", err.code)
	}
}

func TestEnvIntIgnoresInvalidAndNegativeValues(t *testing.T) {
	t.Setenv("X_TEST_LIMIT", "abc")
	if envInt("X_TEST_LIMIT") != 0 {
		t.Fatal("invalid value should read as 0")
	}
	t.Setenv("X_TEST_LIMIT", "-5")
	if envInt("X_TEST_LIMIT") != 0 {
		t.Fatal("negative value should read as 0")
	}
	t.Setenv("X_TEST_LIMIT", " 7 ")
	if envInt("X_TEST_LIMIT") != 7 {
		t.Fatal("padded value should parse")
	}
}

func TestRequestIPPrefersFirstForwardedAddress(t *testing.T) {
	r := &http.Request{Header: http.Header{}, RemoteAddr: "10.0.0.5:4321"}
	if got := requestIP(r); got != "10.0.0.5" {
		t.Fatalf("expected peer address, got %q", got)
	}
	r.Header.Set("X-Forwarded-For", "198.51.100.9, 10.0.0.1")
	if got := requestIP(r); got != "198.51.100.9" {
		t.Fatalf("expected first forwarded address, got %q", got)
	}
	r.Header.Set("X-Forwarded-For", "not-an-ip")
	if got := requestIP(r); got != "10.0.0.5" {
		t.Fatalf("garbage header should fall back to the peer address, got %q", got)
	}
}
