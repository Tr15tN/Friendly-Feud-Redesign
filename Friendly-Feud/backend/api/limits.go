package api

import (
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Room creation limits protect a public instance from bots filling memory.
//
//	MAX_ROOMS                 maximum number of live rooms (0 or unset = unlimited)
//	ROOM_CREATE_LIMIT_PER_HOUR  rooms one IP may create per hour (0 or unset = unlimited)
const roomCreateWindow = time.Hour

// envInt reads a non-negative integer environment variable; invalid or missing values give 0.
func envInt(name string) int {
	value, err := strconv.Atoi(strings.TrimSpace(os.Getenv(name)))
	if err != nil || value < 0 {
		return 0
	}
	return value
}

// creationLimiter is a per-key sliding window counter.
type creationLimiter struct {
	mu     sync.Mutex
	events map[string][]time.Time
}

var roomCreationLimiter = &creationLimiter{events: map[string][]time.Time{}}

// allow records an attempt for key and reports whether it is within limit per window.
// A limit of 0 disables limiting.
func (l *creationLimiter) allow(key string, limit int, window time.Duration, now time.Time) bool {
	if limit <= 0 {
		return true
	}
	l.mu.Lock()
	defer l.mu.Unlock()

	cutoff := now.Add(-window)
	recent := l.events[key][:0]
	for _, t := range l.events[key] {
		if t.After(cutoff) {
			recent = append(recent, t)
		}
	}
	if len(recent) >= limit {
		l.events[key] = recent
		return false
	}
	l.events[key] = append(recent, now)

	// Drop idle keys so the map cannot grow without bound.
	if len(l.events) > 4096 {
		for k, times := range l.events {
			if len(times) == 0 || !times[len(times)-1].After(cutoff) {
				delete(l.events, k)
			}
		}
	}
	return true
}

// checkRoomCreation applies the room cap and the per-IP rate limit.
// liveRooms is the current number of rooms; ip identifies the requester.
func checkRoomCreation(ip string, liveRooms int, now time.Time) GameError {
	if max := envInt("MAX_ROOMS"); max > 0 && liveRooms >= max {
		return GameError{code: ROOM_LIMIT_REACHED, message: "The server is at its room limit"}
	}
	if !roomCreationLimiter.allow(ip, envInt("ROOM_CREATE_LIMIT_PER_HOUR"), roomCreateWindow, now) {
		return GameError{code: ROOM_CREATION_RATE_LIMITED, message: "Too many rooms created from this address"}
	}
	return GameError{}
}

// requestIP returns the client address. The reverse proxy (Caddy, then nginx) sets X-Forwarded-For;
// the first entry is the original client. Without a proxy we fall back to the TCP peer address.
func requestIP(r *http.Request) string {
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		first := strings.TrimSpace(strings.Split(forwarded, ",")[0])
		if ip := net.ParseIP(first); ip != nil {
			return ip.String()
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}
