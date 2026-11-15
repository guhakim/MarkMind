import type { Metadata } from "next"
import Link from "next/link"
import { notFound } from "next/navigation"
import { DocsShell } from "@/components/docs-shell"
import { BLOG_POSTS, findPost } from "@/lib/blog-posts"

export const dynamicParams = false

export function generateStaticParams() {
  return BLOG_POSTS.map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const post = findPost((await params).slug)
  if (!post) return {}
  return {
    title: `${post.title} · MarkMind 블로그`,
    description: post.desc,
    openGraph: { type: "article", title: post.title, description: post.desc, publishedTime: post.date },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ slug: string }> }) {
  const post = findPost((await params).slug)
  if (!post) notFound()
  const others = BLOG_POSTS.filter((p) => p.slug !== post.slug)

  return (
    <DocsShell current="blog">
      <article className="doc">
        <Link href="/blog" className="kicker no-underline">
          ← 블로그
        </Link>
        <h1>{post.title}</h1>
        <p className="lead">
          <time dateTime={post.date}>{post.date}</time>
        </p>
        {post.body}
      </article>

      <aside className="mt-16 pt-8 border-t border-border">
        <h2 className="text-sm font-semibold text-muted-foreground mb-4">다른 글</h2>
        <ul className="grid gap-3">
          {others.map((p) => (
            <li key={p.slug}>
              <Link href={`/blog/${p.slug}`} className="text-foreground hover:text-primary break-keep">
                {p.title}
              </Link>
            </li>
          ))}
        </ul>
      </aside>
    </DocsShell>
  )
}
