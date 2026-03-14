// Markdownレンダリングコンポーネント
// AI生成テキストをreact-markdownでリッチ表示する

import { Component, type ReactNode } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

// --- 型定義 ---

interface MarkdownRendererProps {
  content: string
  variant: 'full' | 'inline'
  className?: string
}

// --- sanitize設定 ---

// full: デフォルトスキーマから危険タグを除去
const fullSchema = {
  ...defaultSchema,
  tagNames: (defaultSchema.tagNames ?? []).filter(
    (tag) => !['script', 'iframe', 'img', 'style', 'form', 'input'].includes(tag),
  ),
}

// inline: 許可要素を最小限に制限
const inlineAllowedElements = ['p', 'strong', 'em', 'code', 'a', 'ul', 'ol', 'li', 'br']
const inlineSchema = {
  ...defaultSchema,
  tagNames: inlineAllowedElements,
}

// --- コンポーネントオーバーライド ---
// variant別にモジュールレベルで定数化（レンダリングごとの再生成を防ぐ）

function buildComponents(variant: 'full' | 'inline'): Components {
  const isInline = variant === 'inline'

  // variant非依存のコンポーネント（共通）
  const shared: Components = {
    h1: ({ children }) => (
      <h1 className="text-xl font-bold mt-6 mb-3 text-foreground">{children}</h1>
    ),
    h2: ({ children }) => (
      <h2 className="text-lg font-bold mt-5 mb-2 text-foreground">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="text-base font-semibold mt-4 mb-1.5 text-foreground">{children}</h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-sm font-semibold mt-3 mb-1 text-foreground">{children}</h4>
    ),
    li: ({ children }) => <li className="text-foreground">{children}</li>,
    blockquote: ({ children }) => (
      <blockquote className="border-l-2 border-border pl-3 my-3 text-muted-foreground italic">
        {children}
      </blockquote>
    ),
    // preでコードブロック全体のスタイルを設定
    pre: ({ children }) => (
      <pre className="my-3 overflow-x-auto rounded-md bg-[#1e1e1e] p-3">{children}</pre>
    ),
    // codeはpre内かインラインかで出し分け
    code: ({ className, children }) => {
      // language-xxxクラスがあればコードブロック内
      const isCodeBlock = typeof className === 'string' && className.includes('language-')
      if (isCodeBlock) {
        return (
          <code className="font-mono text-[13px] leading-relaxed text-[#e5e5e5]">{children}</code>
        )
      }
      // インラインコード
      return (
        <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[13px]">{children}</code>
      )
    },
    a: ({ href, children }) => {
      // httpまたはhttpsで始まるURLのみリンクにする
      if (typeof href === 'string' && /^https?:\/\//.test(href)) {
        return (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline"
          >
            {children}
          </a>
        )
      }
      return <span>{children}</span>
    },
    table: ({ children }) => (
      <table className="border-collapse w-full text-sm my-3">{children}</table>
    ),
    thead: ({ children }) => <thead>{children}</thead>,
    th: ({ children }) => (
      <th className="bg-muted font-semibold text-left p-2 border-b border-border text-foreground">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="p-2 border-b border-border text-foreground">{children}</td>
    ),
    hr: () => <hr className="my-4 border-border" />,
    strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
    em: ({ children }) => <em className="italic">{children}</em>,
  }

  return {
    ...shared,
    // variant依存のコンポーネント
    p: ({ children }) => <p className={isInline ? 'my-1' : 'my-2'}>{children}</p>,
    ul: ({ children }) => (
      <ul
        className={isInline ? 'list-disc pl-4 my-1 space-y-0.5' : 'list-disc pl-5 my-2 space-y-0.5'}
      >
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol
        className={
          isInline ? 'list-decimal pl-4 my-1 space-y-0.5' : 'list-decimal pl-5 my-2 space-y-0.5'
        }
      >
        {children}
      </ol>
    ),
  }
}

const fullComponents = buildComponents('full')
const inlineComponents = buildComponents('inline')

// --- ErrorBoundary ---

interface ErrorBoundaryProps {
  rawContent: string
  children: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
}

class MarkdownErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error) {
    console.warn('MarkdownRenderer: レンダリングエラー', error)
  }

  render() {
    if (this.state.hasError) {
      return (
        <pre className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          {this.props.rawContent}
        </pre>
      )
    }
    return this.props.children
  }
}

// --- メインコンポーネント ---

export function MarkdownRenderer({ content, variant, className }: MarkdownRendererProps) {
  const components = variant === 'full' ? fullComponents : inlineComponents
  const schema = variant === 'full' ? fullSchema : inlineSchema

  return (
    <MarkdownErrorBoundary rawContent={content}>
      <div
        className={cn(
          '[&>:first-child]:mt-0 [&>:last-child]:mb-0 text-sm leading-relaxed text-foreground',
          className,
        )}
      >
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[[rehypeSanitize, schema]]}
          components={components}
          allowedElements={variant === 'inline' ? inlineAllowedElements : undefined}
        >
          {content}
        </ReactMarkdown>
      </div>
    </MarkdownErrorBoundary>
  )
}
