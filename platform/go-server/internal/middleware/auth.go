package middleware

import (
	"machining-erp/internal/services"
	"machining-erp/pkg/response"
	"strings"

	"github.com/gin-gonic/gin"
)

func AuthMiddleware(authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		// 检查账户是否锁定
		if locked, remaining := authService.IsLocked(); locked {
			response.Error(c, 403, gin.H{
				"error":            "账户已锁定",
				"locked":           true,
				"remainingMinutes": remaining,
			})
			c.Abort()
			return
		}

		// 获取 token
		authHeader := c.GetHeader("Authorization")
		token := strings.TrimPrefix(authHeader, "Bearer ")

		if token == "" || !authService.ValidateToken(token) {
			response.Error(c, 401, gin.H{"error": "未授权访问"})
			c.Abort()
			return
		}

		c.Next()
	}
}
