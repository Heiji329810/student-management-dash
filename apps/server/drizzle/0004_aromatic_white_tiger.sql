CREATE TABLE "student_uploads" (
	"id" text PRIMARY KEY NOT NULL,
	"ownerId" text NOT NULL,
	"currentVersion" integer DEFAULT 1 NOT NULL,
	"recalled" boolean DEFAULT false NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL,
	"updatedAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_comments" (
	"id" text PRIMARY KEY NOT NULL,
	"versionId" text NOT NULL,
	"teacherId" text NOT NULL,
	"teacherName" text NOT NULL,
	"body" text NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "upload_versions" (
	"id" text PRIMARY KEY NOT NULL,
	"uploadId" text NOT NULL,
	"version" integer NOT NULL,
	"name" text NOT NULL,
	"mime" text NOT NULL,
	"size" integer NOT NULL,
	"base64" text NOT NULL,
	"preview" jsonb NOT NULL,
	"createdAt" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "student_uploads" ADD CONSTRAINT "student_uploads_ownerId_user_id_fk" FOREIGN KEY ("ownerId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_comments" ADD CONSTRAINT "upload_comments_versionId_upload_versions_id_fk" FOREIGN KEY ("versionId") REFERENCES "public"."upload_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_comments" ADD CONSTRAINT "upload_comments_teacherId_user_id_fk" FOREIGN KEY ("teacherId") REFERENCES "public"."user"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "upload_versions" ADD CONSTRAINT "upload_versions_uploadId_student_uploads_id_fk" FOREIGN KEY ("uploadId") REFERENCES "public"."student_uploads"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "student_upload_owner_idx" ON "student_uploads" USING btree ("ownerId");--> statement-breakpoint
CREATE INDEX "upload_comment_version_idx" ON "upload_comments" USING btree ("versionId");--> statement-breakpoint
CREATE UNIQUE INDEX "upload_version_unique" ON "upload_versions" USING btree ("uploadId","version");