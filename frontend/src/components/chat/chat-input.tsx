'use client';

import { useState } from 'react';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface ChatInputProps {
  onSubmit: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  submitLabel?: string;
}

export function ChatInput({
  onSubmit,
  disabled = false,
  placeholder = 'Type your message...',
  submitLabel = 'Send',
}: ChatInputProps) {
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (message.trim() && !disabled) {
      onSubmit(message);
      setMessage('');
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col gap-3">
          <Textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className="min-h-[100px] resize-none"
          />
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">
              {message.length} / 10,000 characters
            </span>
            <Button
              onClick={handleSubmit}
              disabled={disabled || !message.trim() || message.length > 10000}
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
