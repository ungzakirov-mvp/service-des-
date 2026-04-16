#!/bin/bash
curl -s -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@novumtech.uz","password":"admin123"}'