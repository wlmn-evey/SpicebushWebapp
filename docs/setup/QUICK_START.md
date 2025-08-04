# 🚀 Quick Start Guide

## Start the Project in 3 Steps

### 1️⃣ Copy Environment Settings
```bash
cp .env.example .env.local
```

### 2️⃣ Start Everything
```bash
docker compose up -d
```

### 3️⃣ Open the Website
Wait ~30 seconds for services to start, then open:
- 🌐 **Website**: http://localhost:4321
- 📊 **Database Admin**: http://localhost:3000 (Supabase Studio)
- 📧 **Email Testing**: http://localhost:8025 (MailHog)

That's it! You're done! 🎉

---

## 🛠️ Common Commands

### Stop Everything
```bash
docker compose down
```

### View Logs
```bash
docker compose logs -f app
```

### Restart After Code Changes
```bash
docker compose restart app
```

### Complete Reset (if things are really broken)
```bash
docker compose down -v
docker compose up -d
```

---

## 🚨 Troubleshooting

### "Port already in use" Error
Another service is using the port. Stop it or change the port in docker-compose.yml

### "Cannot connect to database" Error
1. Make sure all services are running: `docker compose ps`
2. Wait a bit longer - database takes ~30 seconds to start
3. Check logs: `docker compose logs supabase-db`

### Services Keep Restarting
1. Stop everything: `docker compose down`
2. Clean up: `docker system prune -f`
3. Start fresh: `docker compose up -d`

---

## ⚠️ Important Rules

### ✅ DO:
- Use ONLY `docker-compose.yml`
- Check logs if something doesn't work
- Ask for help if stuck

### 🚫 DON'T:
- Create new docker-compose files
- Modify service configurations without understanding them
- Use the archived configurations in `/docker/archived-configs/`

---

## 📚 More Information

- **Full Documentation**: See README.md
- **Database Details**: See DATABASE_SETUP_AUDIT.md
- **Development Guide**: See DOCKER_DEVELOPMENT.md

## 🤝 Need Help?

1. Check the logs: `docker compose logs`
2. Look for errors in the browser console
3. Check that all services are running: `docker compose ps`
4. Read the troubleshooting section above

Remember: **Keep it simple!** If the basic setup isn't working, fix it rather than creating alternatives.