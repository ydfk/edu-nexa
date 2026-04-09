@{
  Host = "your.server.ip"
  User = "deploy"
  Port = 22
  SshKeyPath = "C:\\Users\\you\\.ssh\\id_rsa"
  RemoteDeployPath = "/var/www/edunexa-admin/dist"
  ReloadCommand = "systemctl reload caddy"
}
