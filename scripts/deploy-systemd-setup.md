# Systemd timer setup for auto-deploy

## 1. Create the service file

`/etc/systemd/system/taliott-deploy.service`
```ini
[Unit]
Description=Taliott auto-deploy

[Service]
Type=oneshot
ExecStart=/path/to/taliott/scripts/deploy.sh
StandardOutput=journal
StandardError=journal
```

## 2. Create the timer file

`/etc/systemd/system/taliott-deploy.timer`
```ini
[Unit]
Description=Taliott auto-deploy daily at 2AM

[Timer]
OnCalendar=*-*-* 02:00:00
Persistent=true

[Install]
WantedBy=timers.target
```

## 3. Enable and start

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now taliott-deploy.timer
```

## Useful commands

```bash
systemctl list-timers taliott-deploy.timer   # next scheduled run
journalctl -u taliott-deploy.service -f      # follow logs
journalctl -u taliott-deploy.service -n 50   # last 50 lines
sudo systemctl start taliott-deploy.service  # run immediately
sudo systemctl disable taliott-deploy.timer  # turn off scheduling
```

## First-time server setup

```bash
chmod +x /path/to/taliott/scripts/deploy.sh
```
