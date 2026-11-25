package api

type GameError struct {
	code    ErrorCode
	message string
}

type ErrorCode string

const (
	ROOM_NOT_FOUND             ErrorCode = "errors.room_not_found"
	PARSE_ERROR                ErrorCode = "errors.parse_error"
	GAME_CLOSED                ErrorCode = "errors.game_closed"
	HOST_QUIT                  ErrorCode = "errors.host_quit"
	IMAGE_TOO_LARGE            ErrorCode = "errors.image_too_large"
	CSV_TOO_LARGE              ErrorCode = "errors.csv_too_large"
	CSV_INVALID_FORMAT         ErrorCode = "errors.csv_invalid_format"
	UNKNOWN_FILE_TYPE          ErrorCode = "errors.unknown_file_type"
	SERVER_ERROR               ErrorCode = "errors.server_error"
	BUZZER_REGISTER_ERROR      ErrorCode = "errors.buzzer_register"
	SPECTATOR_REGISTER_ERROR   ErrorCode = "errors.spectator_register"
	CHANGE_LANG_ERROR          ErrorCode = "errors.change_lang"
	CONNECTION_LOST            ErrorCode = "errors.connection_lost"
	MISSING_INPUT              ErrorCode = "errors.missing_input"
	UNABLE_TO_CONNECT          ErrorCode = "errors.unable_to_connect"
	PLAYER_NOT_FOUND           ErrorCode = "errors.player_not_found"
	FORBIDDEN                  ErrorCode = "errors.forbidden"
	UNAUTHENTICATED            ErrorCode = "errors.unauthenticated"
	ROOM_CREATION_PAUSED       ErrorCode = "errors.room_creation_paused"
	ROOM_LOCKED                ErrorCode = "errors.room_locked"
	PAIRING_INVALID            ErrorCode = "errors.pairing_invalid"
	PAIRING_EXPIRED            ErrorCode = "errors.pairing_expired"
	PAIRING_RATE_LIMITED       ErrorCode = "errors.pairing_rate_limited"
	DEVICE_REVOKED             ErrorCode = "errors.device_revoked"
	DEVICE_NOT_FOUND           ErrorCode = "errors.device_not_found"
	DEVICE_LIMIT               ErrorCode = "errors.device_limit"
	ROOM_LIMIT_REACHED         ErrorCode = "errors.room_limit_reached"
	ROOM_CREATION_RATE_LIMITED ErrorCode = "errors.room_creation_rate_limited"
)
