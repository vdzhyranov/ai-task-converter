-- CreateEnum
CREATE TYPE "Department" AS ENUM ('DESIGN', 'FRONTEND', 'BACKEND');

-- CreateEnum
CREATE TYPE "ConversationStatus" AS ENUM ('ASKING_QUESTIONS', 'AWAITING_APPROVAL', 'GENERATING_TASKS', 'COMPLETED', 'FAILED');

-- CreateEnum
CREATE TYPE "MessageRole" AS ENUM ('USER', 'ASSISTANT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "MessageType" AS ENUM ('FEATURE_DESCRIPTION', 'CLARIFYING_QUESTION', 'ANSWER', 'REQUIREMENTS_SUMMARY', 'APPROVAL', 'REJECTION', 'TASK_RESULT', 'ERROR');

-- CreateTable
CREATE TABLE "Conversation" (
    "id" TEXT NOT NULL,
    "featureDescription" TEXT NOT NULL,
    "requirementsSummary" TEXT,
    "generatedTasks" JSONB,
    "assumptions" TEXT[],
    "questionCount" INTEGER NOT NULL DEFAULT 0,
    "status" "ConversationStatus" NOT NULL DEFAULT 'ASKING_QUESTIONS',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConversationMessage" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "role" "MessageRole" NOT NULL,
    "content" TEXT NOT NULL,
    "messageType" "MessageType" NOT NULL,
    "order" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConversationMessage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Task" (
    "id" TEXT NOT NULL,
    "conversationId" TEXT NOT NULL,
    "department" "Department" NOT NULL,
    "description" TEXT NOT NULL,
    "acceptanceCriteria" TEXT[],
    "priority" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Task_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Conversation_createdAt_idx" ON "Conversation"("createdAt" DESC);

-- CreateIndex
CREATE INDEX "Conversation_status_idx" ON "Conversation"("status");

-- CreateIndex
CREATE INDEX "ConversationMessage_conversationId_order_idx" ON "ConversationMessage"("conversationId", "order");

-- CreateIndex
CREATE INDEX "ConversationMessage_conversationId_createdAt_idx" ON "ConversationMessage"("conversationId", "createdAt");

-- CreateIndex
CREATE INDEX "Task_conversationId_idx" ON "Task"("conversationId");

-- CreateIndex
CREATE INDEX "Task_department_idx" ON "Task"("department");

-- CreateIndex
CREATE INDEX "Task_conversationId_department_idx" ON "Task"("conversationId", "department");

-- AddForeignKey
ALTER TABLE "ConversationMessage" ADD CONSTRAINT "ConversationMessage_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Task" ADD CONSTRAINT "Task_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
