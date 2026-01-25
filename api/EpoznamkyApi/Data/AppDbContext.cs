using EpoznamkyApi.Models;
using Microsoft.EntityFrameworkCore;

namespace EpoznamkyApi.Data;

public class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Note> Notes => Set<Note>();
    public DbSet<Folder> Folders => Set<Folder>();
    public DbSet<Tag> Tags => Set<Tag>();
    public DbSet<NoteTag> NoteTags => Set<NoteTag>();
    public DbSet<NoteShare> NoteShares => Set<NoteShare>();
    public DbSet<User> Users => Set<User>();
    public DbSet<FileUpload> FileUploads => Set<FileUpload>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        // Note
        modelBuilder.Entity<Note>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.FolderId);
            entity.HasIndex(e => e.IsDeleted);
            entity.HasIndex(e => e.DeletedAt);
            entity.HasIndex(e => new { e.UserId, e.IsDeleted });

            // Full-text search vector - stored generated column managed by PostgreSQL
            entity.Property(e => e.SearchVector)
                .HasColumnType("tsvector")
                .HasComputedColumnSql(
                    @"setweight(to_tsvector('simple', coalesce(""Title"", '')), 'A') || setweight(to_tsvector('simple', coalesce(""Content"", '')), 'B')",
                    stored: true);

            entity.HasIndex(e => e.SearchVector)
                .HasMethod("GIN");

            entity.HasOne<Folder>()
                .WithMany()
                .HasForeignKey(e => e.FolderId)
                .OnDelete(DeleteBehavior.SetNull);
        });

        // Folder
        modelBuilder.Entity<Folder>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.ParentId);

            entity.HasOne<Folder>()
                .WithMany()
                .HasForeignKey(e => e.ParentId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // Tag
        modelBuilder.Entity<Tag>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
        });

        // NoteTag (many-to-many)
        modelBuilder.Entity<NoteTag>(entity =>
        {
            entity.HasKey(e => new { e.NoteId, e.TagId });

            entity.HasOne<Note>()
                .WithMany()
                .HasForeignKey(e => e.NoteId)
                .OnDelete(DeleteBehavior.Cascade);

            entity.HasOne<Tag>()
                .WithMany()
                .HasForeignKey(e => e.TagId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // NoteShare
        modelBuilder.Entity<NoteShare>(entity =>
        {
            entity.HasKey(e => new { e.NoteId, e.SharedWithUserId });

            entity.HasOne<Note>()
                .WithMany()
                .HasForeignKey(e => e.NoteId)
                .OnDelete(DeleteBehavior.Cascade);
        });

        // FileUpload
        modelBuilder.Entity<FileUpload>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.UserId);
            entity.HasIndex(e => e.NoteId);
        });

        // User
        modelBuilder.Entity<User>(entity =>
        {
            entity.HasKey(e => e.Id);
            entity.HasIndex(e => e.Email).IsUnique();
        });
    }
}
