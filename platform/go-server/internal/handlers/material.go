package handlers

import (
	"machining-erp/internal/models"
	"machining-erp/internal/repository"

	"github.com/gin-gonic/gin"
)

type MaterialHandler struct {
	repo *repository.MaterialRepository
}

func NewMaterialHandler(repo *repository.MaterialRepository) *MaterialHandler {
	return &MaterialHandler{repo: repo}
}

func (h *MaterialHandler) List(c *gin.Context) {
	materials, err := h.repo.GetAll()
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, materials)
}

func (h *MaterialHandler) Create(c *gin.Context) {
	var req models.Material
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	id, err := h.repo.Create(&req)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"id": id})
}

type RemnantHandler struct {
	repo *repository.RemnantRepository
}

func NewRemnantHandler(repo *repository.RemnantRepository) *RemnantHandler {
	return &RemnantHandler{repo: repo}
}

func (h *RemnantHandler) List(c *gin.Context) {
	remnants, err := h.repo.GetAll()
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, remnants)
}

func (h *RemnantHandler) Create(c *gin.Context) {
	var req models.Remnant
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(400, gin.H{"error": err.Error()})
		return
	}

	id, err := h.repo.Create(&req)
	if err != nil {
		c.JSON(500, gin.H{"error": err.Error()})
		return
	}
	c.JSON(200, gin.H{"id": id})
}
