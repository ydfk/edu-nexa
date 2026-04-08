package db

import (
	"testing"

	"github.com/ydfk/edu-nexa/apps/api/pkg/config"
)

func TestBuildDialectorUsesSQLiteByDefault(t *testing.T) {
	prevConfig := config.Current
	t.Cleanup(func() {
		config.Current = prevConfig
	})

	config.Current.Database.Driver = ""
	config.Current.Database.Path = "tmp/test.sqlite"
	config.Current.Database.DSN = ""

	dialector, err := buildDialector()
	if err != nil {
		t.Fatalf("build sqlite dialector: %v", err)
	}
	if dialector == nil {
		t.Fatalf("expected sqlite dialector")
	}
}

func TestBuildDialectorUsesPostgresDSN(t *testing.T) {
	prevConfig := config.Current
	t.Cleanup(func() {
		config.Current = prevConfig
	})

	config.Current.Database.Driver = "postgres"
	config.Current.Database.Path = ""
	config.Current.Database.DSN = "host=127.0.0.1 user=postgres password=postgres dbname=edu_nexa sslmode=disable"

	dialector, err := buildDialector()
	if err != nil {
		t.Fatalf("build postgres dialector: %v", err)
	}
	if dialector == nil {
		t.Fatalf("expected postgres dialector")
	}
}

func TestBuildDialectorRejectsPostgresWithoutDSN(t *testing.T) {
	prevConfig := config.Current
	t.Cleanup(func() {
		config.Current = prevConfig
	})

	config.Current.Database.Driver = "postgres"
	config.Current.Database.Path = ""
	config.Current.Database.DSN = ""

	if _, err := buildDialector(); err == nil {
		t.Fatalf("expected postgres dsn error")
	}
}
