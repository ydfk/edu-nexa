package guardianprofile

import "strings"

func defaultPasswordForPhone(phone string) string {
	trimmed := normalizePhone(phone)
	if len(trimmed) <= 4 {
		if trimmed == "" {
			return "12341234"
		}

		return trimmed + "1234"
	}

	return trimmed[len(trimmed)-4:] + "1234"
}

func resolveGuardianPassword(phone string, password string) string {
	trimmedPassword := strings.TrimSpace(password)
	if trimmedPassword != "" {
		return trimmedPassword
	}

	return defaultPasswordForPhone(phone)
}

func normalizePhone(phone string) string {
	var builder strings.Builder
	for _, ch := range strings.TrimSpace(phone) {
		if ch >= '0' && ch <= '9' {
			builder.WriteRune(ch)
		}
	}

	return builder.String()
}
