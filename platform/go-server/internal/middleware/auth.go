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
				"code":             response.CodeAccountLocked,
				"message":          response.CodeAccountLocked.GetMessage(),
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
			response.Unauthorized(c, response.CodeTokenInvalid, response.CodeTokenInvalid.GetMessage())
			c.Abort()
			return
		}

		c.Next()
	}
}
