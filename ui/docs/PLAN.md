# Frontend Scope

This document reflects the current product scope, not the original aspirational architecture.

## Current Product

The shipped notes app is:

- server-backed
- single-owner
- Keycloak-authenticated
- Redux-managed
- TipTap-based for rich text editing

It is not currently:

- offline-first
- collaborative
- powered by a generated API client
- backed by IndexedDB sync

## Implemented Areas

### Notes

- list, filter, sort, pin, trash, restore, permanent delete
- note tabs with a single active mounted editor
- auto-save with countdown and dirty-state tracking

### Organization

- folders with hierarchy
- tag assignment and filtering
- drag and drop for note movement and reorder flows

### Editor

- TipTap-based rich text editing
- markdown preview
- file upload
- markdown and HTML export
- BlockNote-to-TipTap migration for legacy content

### App Shell

- responsive three-panel desktop layout
- mobile bottom navigation
- persisted panel layout preferences
- theme and language switching

## Architectural Reality

### Frontend

- React 19
- Redux Toolkit
- Axios service layer
- CSS Modules + MUI

### Backend Contract

- REST endpoints under `/api/v1`
- full entities returned on create and update
- ownership validation for note-folder-tag relationships
- no active sharing API surface

## Near-Term Priorities

1. Keep docs aligned with the shipped architecture.
2. Improve performance incrementally inside the current Redux/Axios model.
3. Preserve a clean path for future offline or collaboration work without pretending it already exists.
