# Mission Control – Design Guide

## Reference
Clean, modern, minimal SaaS dashboard.

## Layout
- **Fixed left sidebar:** ~180px wide, white background (#FFFFFF), right border 1px solid #E5E7EB
- **Top header bar:** ~50px tall, white, bottom border 1px solid #E5E7EB
- **Main content area:** #FAFAFA background, scrollable

## Sidebar
- **Header:** "🎯 Mission Control" text, bold, 16px, color #111827
- **Nav items:** Icon + label, 14px, font-weight 500
  - Default: text #374151, icon #6B7280
  - Active: bg #DBEAFE, text #2563EB, icon #2563EB, border-radius 8px
  - Hover: bg #F3F4F6, border-radius 6px
- **Items (v0.1):** Only "Tasks" is active/clickable. Others grayed out as placeholders:
  - Dashboard, Agents, Activity, **Tasks** (active), Skills, Usage
- **Bottom:** "Main Agent 🦝" user section with Settings (grayed out)

## Top Header
- **Left:** Date/time (13px, monospace-ish, #6B7280)
- **Center:** Search bar (300px wide, 36px tall, bg #F3F4F6, border 1px #E5E7EB, border-radius 8px)
- **Right:** Can be empty for v0.1

## Sub-Tabs (within Tasks page)
- Horizontal tabs: Tasks | Templates | Recurring | Archived
- Active: #2563EB text, 2px blue bottom border
- Inactive: #6B7280
- Font: 14px, font-weight 500
- Bottom border: 1px solid #E5E7EB

## Cards (Task Cards, Template Cards)
- Background: #FFFFFF
- Border: 1px solid #E5E7EB
- Border-radius: 10px
- Padding: 12px
- Shadow: 0 1px 2px rgba(0,0,0,0.05)
- Margin-bottom: 8px

## Buttons
- **Primary (+ New Task, + New Template):** bg #2563EB, text white, 14px font-weight 600, border-radius 8px, padding 8px 16px
- **Hover:** #1D4ED8

## Status Colors
- Scheduled: #6B7280 (gray)
- Queue: #3B82F6 (blue)
- In Progress: #F59E0B (amber)
- Done: #10B981 (green)
- Active dot: #10B981 (green)

## Agent Colors
- Main Agent (Main): #6366f1 (indigo), emoji 🦝
- Codex (Coding): #10b981 (green), emoji 🤖
- Research: #f59e0b (amber), emoji 🔍

## Typography
- Font: Inter (Google Font) or system sans-serif
- Headings: 28px, font-weight 700, #111827
- Subtitles: 14px, font-weight 400, #6B7280
- Body: 14px, #374151
- Small/meta: 12-13px, #9CA3AF

## View Toggle (Tasks)
- Three icon buttons grouped: Agent View, Board View, List View
- 32x32px each, border 1px #E5E7EB, border-radius 6px
- Active: bg #F3F4F6

## Kanban Columns (both Agent + Status views)
- Column width: ~250px
- Column gap: 16px
- Column bg: #F9FAFB or #FFFFFF
- Column border: 1px solid #E8E8E8, border-radius 12px
- Column header: agent/status name bold 15px + count right-aligned 14px #9CA3AF

## Recurring List
- Container: white, border 1px #E5E7EB, border-radius 12px
- Row height: 60-70px, padding 16px horizontal
- Row hover: bg #F9FAFB
- Green dot (10px) for active
- Schedule name: 15px bold #111827
- Recurrence text: 13px #6B7280
- Action icons right: pause (red #EF4444), delete (gray #9CA3AF)

## Task Detail
- Two-column layout: ~40% left (agent info), ~60% right (task info)
- Large agent avatar: 120x120px, border-radius 12px
- Back link: "← Back to Tasks", 14px, #6B7280
- Activity log: chronological entries with timestamps
