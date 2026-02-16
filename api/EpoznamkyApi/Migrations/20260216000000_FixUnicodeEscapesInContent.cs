using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EpoznamkyApi.Migrations
{
    /// <inheritdoc />
    public partial class FixUnicodeEscapesInContent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Fix notes imported from Notion that contain literal JSON Unicode escapes
            // (e.g. \u0161 instead of š) in the Content column.
            // This breaks full-text search because PostgreSQL's tsvector tokenizer
            // splits on backslashes, producing broken tokens like 'kr' + 'u0161iak'
            // instead of 'kršiak'.
            // Casting through jsonb decodes the escapes into actual Unicode characters.
            // The SearchVector (STORED generated column) auto-recomputes after update.
            migrationBuilder.Sql(@"
                UPDATE ""Notes""
                SET ""Content"" = ""Content""::jsonb::text
                WHERE ""Content"" LIKE '%\\u0%';
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Data migration — not reversible (the original escaped form is not preserved)
        }
    }
}
