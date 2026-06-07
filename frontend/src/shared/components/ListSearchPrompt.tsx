interface ListSearchPromptProps {
  message: string
  testId?: string
}

export function ListSearchPrompt({ message, testId }: ListSearchPromptProps) {
  return (
    <p role="status" data-testid={testId} className="py-12 text-center text-muted-foreground">
      {message}
    </p>
  )
}
