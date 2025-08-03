# %%
import pandas as pd
df = pd.read_csv("~/Downloads/people-100000.csv")
df.head()
# %%
# Test imports
try:
    from ipuppy_notebooks import add_new_cell, delete_cell, alter_cell_content, execute_cell, swap_cell_type, move_cell
    print("✅ All imports successful!")
except Exception as e:
    print(f"❌ Import error: {e}")

# Test function calls (these won't actually broadcast since there's no socketio_manager connection in this context)
try:
    add_new_cell(0, "code", "print('Hello World')")
    print("✅ add_new_cell function call successful!")
except Exception as e:
    print(f"❌ add_new_cell error: {e}")

try:
    delete_cell(0)
    print("✅ delete_cell function call successful!")
except Exception as e:
    print(f"❌ delete_cell error: {e}")

try:
    alter_cell_content(0, "x = 5\ny = 10\nprint(x + y)")
    print("✅ alter_cell_content function call successful!")
except Exception as e:
    print(f"❌ alter_cell_content error: {e}")

try:
    execute_cell(0, "print('Executing from backend!')")
    print("✅ execute_cell function call successful!")
except Exception as e:
    print(f"❌ execute_cell error: {e}")

try:
    swap_cell_type(0, "markdown")
    print("✅ swap_cell_type function call successful!")
except Exception as e:
    print(f"❌ swap_cell_type error: {e}")

try:
    move_cell(0, 1)
    print("✅ move_cell function call successful!")
except Exception as e:
    print(f"❌ move_cell error: {e}")
