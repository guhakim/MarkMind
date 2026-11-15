import type { Metadata } from "next"
import Link from "next/link"
import { DocsShell } from "@/components/docs-shell"
import { BLOG_POSTS } from "@/lib/blog-posts"

export const metadata: Metadata = {
  title: "블로그 · MarkMind",
  description: "북마크를 더 잘 모으고 찾는 방법, MarkMind 활용 팁을 소개합니다.",
}

export default function BlogPage() {
  return (
    <DocsShell current="blog">
      <div className="doc">
        <span className="kicker">블로그</span>
        <h1>MarkMind 블로그</h1>
        <p className="lead">북마크를 더 잘 모으고 다시 찾는 방법, MarkMind 활용 팁을 모았습니다.</p>
      </div>
      <ul className="grid gap-4">
        {BLOG_POSTS.map((post) => (
          <li key={post.slug}>
            <Link
              href={`/blog/${post.slug}`}
              className="block rounded-2xl border border-border p-5 sm:p-6 transition-colors hover:border-primary/40 hover:bg-muted/30"
            >
              <time dateTime={post.date} className="text-xs text-muted-foreground">
                {post.date}
              </time>
              <h2 className="mt-1 mb-2 text-lg font-bold text-foreground break-keep">{post.title}</h2>
              <p className="text-sm text-muted-foreground break-keep">{post.desc}</p>
            </Link>
          </li>
        ))}
      </ul>
    </DocsShell>
  )
}
