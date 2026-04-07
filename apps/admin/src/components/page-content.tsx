import { Search } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-toggle";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";

const appVersion = typeof __APP_VERSION__ === "string" ? __APP_VERSION__ : "dev";

type PageContentProps = {
  children: React.ReactNode;
  fixed?: boolean;
  fluid?: boolean;
};

/**
 * 通用页面包装：提供标准 Header（搜索 + 主题 + 用户菜单）+ Main 容器。
 * 各页面直接用 <PageContent> 包裹内容即可。
 */
export function PageContent({ children, fixed, fluid }: PageContentProps) {
  return (
    <>
      <Header fixed>
        <Search />
        <div className="ml-auto flex items-center gap-3">
          <span className="text-xs text-muted-foreground">v{appVersion}</span>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>
      <Main fixed={fixed} fluid={fluid}>
        {children}
      </Main>
    </>
  );
}
