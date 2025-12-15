-- CreateTable
CREATE TABLE "health_checks" (
    "id" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uptime" DOUBLE PRECISION,
    "memory" JSONB,
    "version" TEXT,

    CONSTRAINT "health_checks_pkey" PRIMARY KEY ("id")
);
