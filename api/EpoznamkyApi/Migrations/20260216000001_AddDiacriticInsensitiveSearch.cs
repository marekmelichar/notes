using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace EpoznamkyApi.Migrations
{
    /// <inheritdoc />
    public partial class AddDiacriticInsensitiveSearch : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Enable unaccent extension for diacritic-insensitive search
            migrationBuilder.Sql(@"CREATE EXTENSION IF NOT EXISTS unaccent;");

            // Create IMMUTABLE wrapper (required for STORED generated columns)
            migrationBuilder.Sql(@"
                CREATE OR REPLACE FUNCTION unaccent_immutable(text) RETURNS text
                LANGUAGE SQL STRICT IMMUTABLE AS $$
                    SELECT unaccent('unaccent', $1);
                $$;
            ");

            // Recreate SearchVector with unaccent so 'Kršiak' and 'Krsiak' both match
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_Notes_SearchVector"";");
            migrationBuilder.Sql(@"ALTER TABLE ""Notes"" DROP COLUMN IF EXISTS ""SearchVector"";");

            migrationBuilder.Sql(@"
                ALTER TABLE ""Notes"" ADD COLUMN ""SearchVector"" tsvector
                GENERATED ALWAYS AS (
                    setweight(to_tsvector('simple', unaccent_immutable(coalesce(""Title"", ''))), 'A') ||
                    setweight(to_tsvector('simple', unaccent_immutable(coalesce(""Content"", ''))), 'B')
                ) STORED;
            ");

            migrationBuilder.Sql(@"
                CREATE INDEX ""IX_Notes_SearchVector"" ON ""Notes"" USING GIN(""SearchVector"");
            ");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // Restore original SearchVector without unaccent
            migrationBuilder.Sql(@"DROP INDEX IF EXISTS ""IX_Notes_SearchVector"";");
            migrationBuilder.Sql(@"ALTER TABLE ""Notes"" DROP COLUMN IF EXISTS ""SearchVector"";");

            migrationBuilder.Sql(@"
                ALTER TABLE ""Notes"" ADD COLUMN ""SearchVector"" tsvector
                GENERATED ALWAYS AS (
                    setweight(to_tsvector('simple', coalesce(""Title"", '')), 'A') ||
                    setweight(to_tsvector('simple', coalesce(""Content"", '')), 'B')
                ) STORED;
            ");

            migrationBuilder.Sql(@"
                CREATE INDEX ""IX_Notes_SearchVector"" ON ""Notes"" USING GIN(""SearchVector"");
            ");

            migrationBuilder.Sql(@"DROP FUNCTION IF EXISTS unaccent_immutable(text);");
            migrationBuilder.Sql(@"DROP EXTENSION IF EXISTS unaccent;");
        }
    }
}
