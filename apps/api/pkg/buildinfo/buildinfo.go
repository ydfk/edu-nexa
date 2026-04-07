package buildinfo

import "os"

func Version() string {
	version := os.Getenv("APP_VERSION")
	if version == "" {
		return "dev"
	}

	return version
}
