package main

import (
	"log"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/config"
	"github.com/BuzzLyutic/Skill-sharing-web-platform/routes"
)

func main() {
    // Load configuration
    cfg := config.LoadConfig()

    // Initialize database
    db, err := config.InitDB(cfg)
    if err != nil {
        log.Fatalf("Failed to connect to database: %v", err)
    }

    // Setup router
    r := routes.SetupRouter(db)

    // Start server
    log.Printf("Server starting on port %s", cfg.ServerPort)
    if err := r.Run(":" + cfg.ServerPort); err != nil {
        log.Fatalf("Failed to start server: %v", err)
    }
}
