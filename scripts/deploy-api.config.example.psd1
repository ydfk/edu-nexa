@{
  Host = "your.server.ip"
  User = "deploy"
  Port = 22
  SshKeyPath = "C:\\Users\\you\\.ssh\\id_rsa"
  RemoteWorkingDirectory = "/opt/edunexa-api"
  PullCommand = "docker compose pull"
  UpCommand = "docker compose up -d"
  ReloadCommand = ""
}
