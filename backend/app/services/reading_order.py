"""
Reading order inference service.

Implements row-clustering algorithm per ORD-01:
1. Cluster panels by y-overlap (>50%)
2. Sort rows top-to-bottom
3. Sort within rows LTR or RTL based on direction
4. Renumber panels 1..N

Reference: SPEC.md "Reading-order approach: Heuristic (row-cluster by y-overlap, then sort within row); no ML"
"""

from typing import Literal

from app.models.schemas import Panel


def are_panels_in_same_row(a: Panel, b: Panel, threshold: float = 0.5) -> bool:
    """
    Check if two panels are in the same row based on y-overlap.

    Panels are considered in the same row if they overlap vertically
    by more than the threshold percentage of the smaller panel's height.

    Args:
        a: First panel
        b: Second panel
        threshold: Minimum overlap ratio (default 0.5 = 50%)

    Returns:
        True if panels are in the same row
    """
    # Extract y coordinates from normalized bbox (x, y, w, h)
    a_top, a_bottom = a.bbox[1], a.bbox[1] + a.bbox[3]
    b_top, b_bottom = b.bbox[1], b.bbox[1] + b.bbox[3]

    # Calculate overlap
    overlap_top = max(a_top, b_top)
    overlap_bottom = min(a_bottom, b_bottom)
    overlap_height = max(0, overlap_bottom - overlap_top)

    # Compare to smaller panel's height
    min_height = min(a.bbox[3], b.bbox[3])
    if min_height == 0:
        return False

    return overlap_height / min_height > threshold


def cluster_into_rows(panels: list[Panel], threshold: float = 0.5) -> list[list[Panel]]:
    """
    Cluster panels into rows based on y-overlap.

    Uses a greedy approach:
    1. Sort panels by vertical position (top of bbox)
    2. For each panel, check if it overlaps with any panel in the current row
    3. If yes, add to current row; if no, start a new row

    Args:
        panels: List of panels to cluster
        threshold: Minimum overlap ratio for same-row (default 0.5)

    Returns:
        List of rows, where each row is a list of panels
    """
    if not panels:
        return []

    # Sort panels by vertical position (top of bbox)
    sorted_panels = sorted(panels, key=lambda p: p.bbox[1])

    rows: list[list[Panel]] = []
    current_row: list[Panel] = [sorted_panels[0]]

    for panel in sorted_panels[1:]:
        # Check if this panel belongs in current row
        # by checking overlap with any panel in current row
        belongs_in_row = any(
            are_panels_in_same_row(panel, row_panel, threshold)
            for row_panel in current_row
        )

        if belongs_in_row:
            current_row.append(panel)
        else:
            # Start new row
            rows.append(current_row)
            current_row = [panel]

    # Don't forget last row
    rows.append(current_row)

    return rows


def infer_order(
    panels: list[Panel],
    direction: Literal["ltr", "rtl"] = "ltr",
    threshold: float = 0.5,
) -> list[Panel]:
    """
    Infer reading order for panels.

    Algorithm per ORD-01:
    1. Cluster by y-overlap (>50%)
    2. Sort rows top-to-bottom
    3. Sort within row LTR or RTL
    4. Renumber panels 1..N

    Args:
        panels: List of panels (order doesn't matter)
        direction: "ltr" (Western) or "rtl" (manga)
        threshold: Y-overlap threshold for same-row (default 0.5)

    Returns:
        New list of Panel instances with sequential IDs in reading order
    """
    if not panels:
        return []

    # Cluster into rows
    rows = cluster_into_rows(panels, threshold)

    # Sort rows by vertical position (average y of row)
    rows.sort(key=lambda row: sum(p.bbox[1] for p in row) / len(row))

    # Sort within each row by horizontal position
    for row in rows:
        row.sort(
            key=lambda p: p.bbox[0],
            reverse=(direction == "rtl"),
        )

    # Flatten rows into single list
    ordered: list[Panel] = []
    for row in rows:
        ordered.extend(row)

    # Create new panels with updated IDs (immutable pattern)
    return [
        Panel(id=i + 1, bbox=p.bbox, confidence=p.confidence)
        for i, p in enumerate(ordered)
    ]


def detect_ambiguity(panels: list[Panel], threshold: float = 0.5) -> bool:
    """
    Detect if panel layout is ambiguous.

    Ambiguity indicators per D-14:
    1. Tall panels (height > 2x average width) - complex layouts
    2. Panels that could belong to multiple rows (overlap at lower threshold)

    Args:
        panels: List of panels
        threshold: Row clustering threshold (default 0.5)

    Returns:
        True if layout is ambiguous
    """
    if len(panels) <= 2:
        return False  # Simple layouts are not ambiguous

    # Check for tall panels (height > 2x average width)
    avg_width = sum(p.bbox[2] for p in panels) / len(panels)
    tall_panels = [p for p in panels if p.bbox[3] > 2 * avg_width]

    if tall_panels:
        # Tall panels often indicate complex layouts
        return True

    # Check for panels that could belong to multiple rows
    # Use a lower threshold to detect borderline cases
    rows = cluster_into_rows(panels, threshold)
    for i, row in enumerate(rows):
        if i + 1 < len(rows):
            next_row = rows[i + 1]
            # Check if any panel in current row overlaps with next row at lower threshold
            for panel in row:
                for next_panel in next_row:
                    if are_panels_in_same_row(panel, next_panel, threshold=0.3):
                        # Lower threshold overlap suggests ambiguity
                        return True

    return False
