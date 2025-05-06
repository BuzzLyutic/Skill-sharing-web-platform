package middleware

import (
	"errors"
	"fmt"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"

	"github.com/BuzzLyutic/Skill-sharing-web-platform/config"
    "github.com/BuzzLyutic/Skill-sharing-web-platform/models"
)

// JWTAuthMiddleware проверяет валидность JWT токена
func JWTAuthMiddleware(jwtCfg config.JWTConfig) gin.HandlerFunc {
    jwtSecret := []byte(jwtCfg.SecretKey) // Cache the secret key
    
    return func(c *gin.Context) {
        // Получаем токен из заголовка Authorization
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            log.Printf("JWTAuthMiddleware: Missing Authorization header from %s", c.ClientIP())
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
            return
        }

        // Проверяем формат "Bearer <token>"
        parts := strings.Split(authHeader, " ")
        if len(parts) != 2 || parts[0] != "Bearer" {
            log.Printf("JWTAuthMiddleware: Invalid Authorization header format from %s", c.ClientIP())
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Authorization header format must be Bearer <token>"})
            return
        }

        tokenString := parts[1]

        // Парсим и верифицируем токен
        token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
            // Проверяем, что используется правильный алгоритм
            if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
                return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
            }
            return jwtSecret, nil
        })

        if err != nil {
			// Log the specific parsing error
			log.Printf("JWTAuthMiddleware: Token parsing error from %s: %v", c.ClientIP(), err)
			// Check for specific JWT error types for potentially different client messages
			if errors.Is(err, jwt.ErrTokenMalformed) {
                c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Malformed token"})
            } else if errors.Is(err, jwt.ErrTokenSignatureInvalid) {
                 c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token signature"})
            } else if errors.Is(err, jwt.ErrTokenExpired) || errors.Is(err, jwt.ErrTokenNotValidYet) {
                 c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Token expired or not valid yet"})
            } else {
                 c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
            }
			return
		}

        // Проверяем валидность токена
        if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {

            // Получаем ID пользователя из токена
            userIDStr, ok := claims[ContextUserIDKey].(string)
            if !ok {
                log.Printf("JWTAuthMiddleware: Missing or invalid type for '%s' claim from %s", ContextUserIDKey, c.ClientIP())
                c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims"})
                return
            }
            
            userID, err := uuid.Parse(userIDStr)
            if err != nil {
                log.Printf("JWTAuthMiddleware: Cannot parse '%s' claim '%s' as UUID from %s: %v", ContextUserIDKey, userIDStr, c.ClientIP(), err)
                c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid user ID in token"})
                return
            }

            email, ok := claims[ContextEmailKey].(string)
            if !ok {
                log.Printf("JWTAuthMiddleware: Warning - Missing or invalid type for '%s' claim from %s", ContextEmailKey, c.ClientIP())
            }

            // --- Get Role ---
			role, ok := claims[ContextRoleKey].(string)
			if !ok {
				log.Printf("JWTAuthMiddleware: Missing or invalid type for '%s' claim from %s", ContextRoleKey, c.ClientIP())
				c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token claims (role)"})
				return
			}

            // Сохраняем данные пользователя в контексте Gin
            c.Set(ContextUserIDKey, userID)
            c.Set(ContextEmailKey, email)
            c.Set(ContextRoleKey, role)
            
            log.Printf("JWTAuthMiddleware: User %s (%s) authenticated with role %s", userID, email, role)
            c.Next()
        } else {
            log.Printf("JWTAuthMiddleware: Token deemed invalid (claims type: %T, token.Valid: %t) from %s", token.Claims, token.Valid, c.ClientIP())
            c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
            return
        }
    }
}

// RoleAuthMiddleware проверяет роль пользователя
func RoleAuthMiddleware(requiredRole models.Role) gin.HandlerFunc {
    return func(c *gin.Context) {
        roleValue, exists := c.Get(ContextRoleKey)
        if !exists {
            log.Printf("RoleAuthMiddleware: Role key '%s' not found in context for client %s", ContextRoleKey, c.ClientIP())
            c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "Access forbidden: Role information missing"})
            return
        }

        role, ok := roleValue.(string)
        if !ok {
             log.Printf("RoleAuthMiddleware: Role key '%s' in context is not a string for client %s", ContextRoleKey, c.ClientIP())
             c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Internal server error: Invalid role data"}) // Should not happen if JWT middleware is correct
             return
        }

        // Basic role check - could be expanded for hierarchical roles
        if role != string(requiredRole) {
             log.Printf("RoleAuthMiddleware: Access denied for user %s. Required role: '%s', User role: '%s'", c.GetString(ContextEmailKey), requiredRole, role) // Log email or ID
             c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": fmt.Sprintf("Access forbidden: Requires '%s' role", requiredRole)})
             return
        }

        log.Printf("RoleAuthMiddleware: Role '%s' authorized for user %s", requiredRole, c.GetString(ContextEmailKey))
        c.Next()
    }
}
