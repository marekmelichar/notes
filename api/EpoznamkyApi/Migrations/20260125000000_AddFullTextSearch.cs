using Microsoft.EntityFrameworkCore.Migrations;
using NpgsqlTypes;

#nullable disable

namespace EpoznamkyApi.Migrations
{
    /// <inheritdoc />
    public partial class AddFullTextSearch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Add SearchVector column as a stored generated column
            migrationBuilder.Sql(@"
                ALTER TABLE ""Notes"" ADD COLUMN ""SearchVector"" tsvector
                GENERATED ALWAYS AS (
                    setweight(to_tsvector('simple', coalesce(""Title"", '')), 'A') ||
                    setweight(to_tsvector('simple', coalesce(""Content"", '')), 'B')
                ) STORED;
            ");

            // Create GIN index for fast full-text search
            migrationBuilder.Sql(@"
                CREATE INDEX ""IX_Notes_SearchVector"" ON ""Notes"" USING GIN(""SearchVector"");
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_Notes_SearchVector"";");
            migrationBuilder.Sql(@"ALTER TABLE ""Notes"" DROP COLUMN IF EXISTS ""SearchVector"";");
        }
    }
}
