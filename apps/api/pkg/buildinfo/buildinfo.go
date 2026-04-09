package buildinfo

var version = "dev"

func Version() string {
	if version == "" {
		return "dev"
	}

	return version
}
