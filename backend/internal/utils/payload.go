package utils

import (
	"crypto/rand"
	"math/big"
)

// GenerateRandomPayload generates a random payload of specified size
// This prevents browser caching and ensures accurate measurements
func GenerateRandomPayload(size int) ([]byte, error) {
	payload := make([]byte, size)
	_, err := rand.Read(payload)
	if err != nil {
		return nil, err
	}
	return payload, nil
}

// GenerateRandomBinaryBuffer generates a random binary buffer for upload tests
func GenerateRandomBinaryBuffer(size int) ([]byte, error) {
	return GenerateRandomPayload(size)
}

// GetRandomInt generates a random integer between min and max (inclusive)
func GetRandomInt(min, max int) (int, error) {
	if min >= max {
		return min, nil
	}
	
	bigMax := big.NewInt(int64(max - min + 1))
	n, err := rand.Int(rand.Reader, bigMax)
	if err != nil {
		return min, err
	}
	
	return min + int(n.Int64()), nil
}

