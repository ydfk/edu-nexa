import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const storageSections = [
  {
    title: "本地上传",
    description: "适合本地开发和局域网联调，文件直接落到服务端目录并通过静态路径暴露。",
    points: [
      "把 storage.default_provider 设为 local。",
      "storage.local.base_url 填当前后端可访问域名，不要留空。",
      "开发环境可先用 http://127.0.0.1:25610，真机联调需要换成局域网或公网域名。",
      "图片内容安全严格模式不要和 localhost / 127.0.0.1 搭配使用。",
    ],
    snippet: `storage:
  default_provider: "local"
  local:
    base_url: "http://127.0.0.1:25610"
    dir: "data/uploads"
    public_path: "/uploads"`,
  },
  {
    title: "阿里云 OSS",
    description: "适合正式环境，图片审核也更容易跑通，因为微信侧能访问公网资源。",
    points: [
      "准备 Bucket、Endpoint、Region、AccessKey ID、AccessKey Secret。",
      "base_url 建议填自定义域名或 Bucket 公开访问域名。",
      "后台“基础设置”里把默认上传存储切到阿里云 OSS。",
      "若开启图片内容安全严格模式，优先先用 OSS 联调。",
    ],
    snippet: `storage:
  default_provider: "aliyun_oss"
  aliyun_oss:
    access_key_id: "你的 AccessKey ID"
    access_key_secret: "你的 AccessKey Secret"
    bucket: "你的 bucket"
    endpoint: "https://oss-cn-hangzhou.aliyuncs.com"
    region: "cn-hangzhou"
    path_prefix: "edunexa"
    base_url: "https://cdn.example.com"`,
  },
  {
    title: "又拍云",
    description: "当前实现走 FORM API，适合已有又拍云存储和 CDN 的场景。",
    points: [
      "准备服务名、表单 API Secret、访问域名。",
      "api_host 默认可以保持 https://v0.api.upyun.com。",
      "base_url 建议填绑定好的 CDN 域名。",
      "后台切默认上传存储后，小程序上传会自动走又拍云。",
    ],
    snippet: `storage:
  default_provider: "upyun"
  upyun:
    api_host: "https://v0.api.upyun.com"
    bucket: "你的服务名"
    form_api_secret: "你的 Form API Secret"
    path_prefix: "edunexa"
    base_url: "https://cdn.example.com"`,
  },
];

const safetySections = [
  {
    title: "微信内容安全",
    points: [
      "需要先在服务端配置 wechat.app_id 和 wechat.app_secret。",
      "文本审核会拦到：首页文案、每日作业、用餐备注、作业反馈。",
      "图片审核会在上传成功后调用微信多媒体安全接口。",
      "建议先开开关不启用严格模式，确认接口可用后再切严格模式。",
    ],
    snippet: `wechat:
  app_id: "你的小程序 AppID"
  app_secret: "你的小程序 AppSecret"

storage:
  default_provider: "aliyun_oss"`,
  },
  {
    title: "提审前检查",
    points: [
      "管理后台把默认上传存储切到公网可访问提供方。",
      "在微信后台补齐用户隐私保护指引。",
      "至少跑一轮老师上传图片、家长查看图片的真机闭环。",
      "确认文本和图片审核打开后的失败提示符合业务预期。",
    ],
    snippet: `提审前建议:
1. 不要用 localhost 做图片审核
2. 确认 OSS / 又拍云域名已加入小程序业务域名
3. 确认隐私指引已覆盖手机号与图片上传`,
  },
];

export default function IntegrationGuidePage() {
  return (
    <div className="space-y-4">
      <Card className="border-none bg-[linear-gradient(135deg,_rgba(37,99,235,0.96),_rgba(22,59,140,0.98))] text-white shadow-xl shadow-blue-950/20">
        <CardHeader>
          <CardTitle className="text-2xl">接入指引</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-white/85">
          <p>这一页只解决“怎么配”，不直接存真实密钥。</p>
          <p>真实密钥、Bucket、服务名仍然写在服务端 config.yaml 或部署环境变量里。</p>
          <p>后台“基础设置”页负责切默认上传存储和内容安全开关。</p>
        </CardContent>
      </Card>

      <div className="grid gap-4 xl:grid-cols-3">
        {storageSections.map((section) => (
          <Card key={section.title} className="border-none bg-card/90 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
              <p className="text-sm text-muted-foreground">{section.description}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {section.points.map((point) => (
                  <div key={point} className="rounded-2xl border px-4 py-3 text-sm">
                    {point}
                  </div>
                ))}
              </div>
              <pre className="overflow-x-auto rounded-2xl bg-muted/40 p-4 text-xs leading-6">
                <code>{section.snippet}</code>
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        {safetySections.map((section) => (
          <Card key={section.title} className="border-none bg-card/90 shadow-md">
            <CardHeader>
              <CardTitle className="text-lg">{section.title}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                {section.points.map((point) => (
                  <div key={point} className="rounded-2xl border px-4 py-3 text-sm">
                    {point}
                  </div>
                ))}
              </div>
              <pre className="overflow-x-auto rounded-2xl bg-muted/40 p-4 text-xs leading-6">
                <code>{section.snippet}</code>
              </pre>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
