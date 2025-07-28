#!/bin/bash

# Script to run database connection tests before proceeding with security migration

echo "========================================="
echo "Running Database Connection Tests"
echo "========================================="

# Check if PostgreSQL is running on port 54322
if ! nc -z localhost 54322 2>/dev/null; then
    echo "❌ PostgreSQL is not running on port 54322"
    echo "Please ensure Docker containers are running:"
    echo "  docker-compose up -d"
    exit 1
fi

echo "✅ PostgreSQL is running on port 54322"

# Run the connection tests
echo ""
echo "Running comprehensive database tests..."
npm test tests/database-connection.test.js

# Check test exit status
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ All database connection tests passed!"
    echo "✅ Safe to proceed with step 1.1.2 (backup current configuration)"
else
    echo ""
    echo "❌ Database connection tests failed!"
    echo "Please fix the issues before proceeding with the security migration."
    exit 1
fi