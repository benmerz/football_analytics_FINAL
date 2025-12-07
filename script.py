import requests
from bs4 import BeautifulSoup
import sqlite3
from pathlib import Path

def scrape_bills_draft_picks():
    url = "https://en.wikipedia.org/wiki/List_of_Buffalo_Bills_first-round_draft_picks"
    
    # Simple User Agent to identify as a standard browser
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    response = requests.get(url, headers=headers)
    soup = BeautifulSoup(response.content, 'html.parser')
    
    # Locate the table (specifically the sortable wikitable)
    table = soup.find('table', {'class': 'wikitable sortable'})
    rows = table.find_all('tr')
    
    results = []
    
    # Helper to manage rowspan (years are often merged across rows)
    # Format: { col_index: {'text': '1983', 'rows_left': 1} }
    rowspan_buffer = {}
    
    # Skip the header row
    for row in rows[1:]:
        cells = row.find_all(['th', 'td'])
        current_row_data = []
        cell_idx = 0
        html_cell_ptr = 0
        
        # We expect 6 columns based on the table structure
        while len(current_row_data) < 6:
            # 1. Check if the current column is filled by a previous row's rowspan
            if cell_idx in rowspan_buffer and rowspan_buffer[cell_idx]['rows_left'] > 0:
                current_row_data.append(rowspan_buffer[cell_idx]['text'])
                rowspan_buffer[cell_idx]['rows_left'] -= 1
            
            # 2. If not, grab the next available cell from the HTML
            elif html_cell_ptr < len(cells):
                cell = cells[html_cell_ptr]
                text = cell.get_text(" ", strip=True)
                current_row_data.append(text)
                
                # Check if this new cell has a rowspan attribute
                if cell.has_attr("rowspan"):
                    try:
                        rows_to_span = int(cell['rowspan']) - 1
                        if rows_to_span > 0:
                            rowspan_buffer[cell_idx] = {'text': text, 'rows_left': rows_to_span}
                    except ValueError:
                        pass # Handle cases where rowspan might be malformed
                
                html_cell_ptr += 1
            else:
                # Fill empty if row structure is uneven
                current_row_data.append("")
            
            cell_idx += 1
            
        # Create dictionary with clean keys (no "[20]" suffixes)
        entry = {
            "Season": current_row_data[0],
            "Pick": current_row_data[1],
            "Player": current_row_data[2],
            "Position": current_row_data[3],
            "College": current_row_data[4],
            "Notes": current_row_data[5]
        }
        results.append(entry)

    return results


def create_database(db_path: str = "bills_draft.db") -> None:
    """Create an SQLite database and table for Bills first‑round picks.

    Table name:
        bills_first_round_picks

    Columns:
        id              INTEGER PRIMARY KEY AUTOINCREMENT
        season          TEXT
        pick_overall    TEXT
        player          TEXT
        position        TEXT
        college         TEXT
        notes           TEXT
    """

    conn = sqlite3.connect(db_path)
    try:
        cur = conn.cursor()
        cur.execute(
            """
            CREATE TABLE IF NOT EXISTS bills_first_round_picks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                season TEXT,
                pick_overall TEXT,
                player TEXT,
                position TEXT,
                college TEXT,
                notes TEXT
            );
            """
        )

        # Clear existing rows so reruns replace the data
        cur.execute("DELETE FROM bills_first_round_picks;")

        rows = scrape_bills_draft_picks()
        to_insert = [
            (
                row["Season"],
                row["Pick"],
                row["Player"],
                row["Position"],
                row["College"],
                row["Notes"],
            )
            for row in rows
        ]

        cur.executemany(
            """
            INSERT INTO bills_first_round_picks (
                season, pick_overall, player, position, college, notes
            ) VALUES (?, ?, ?, ?, ?, ?);
            """,
            to_insert,
        )

        conn.commit()
        print(f"Inserted {len(to_insert)} rows into bills_first_round_picks in {db_path}.")
    finally:
        conn.close()


if __name__ == "__main__":
    # Create the database in the current directory
    db_file = Path("bills_draft.db")
    create_database(str(db_file))