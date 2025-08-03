# %%
import pandas as pd
df = pd.read_csv("~/Downloads/people-100000.csv")
df.head()
# %%
import plotly.express as px

# Get value counts for First Name and take top 50 in descending order
name_counts = df['First Name'].value_counts().head(50)

# Create a DataFrame for plotting
name_counts_df = name_counts.reset_index()
name_counts_df.columns = ['First Name', 'Count']

# Create histogram using Plotly Express
fig = px.histogram(
  name_counts_df, x='First Name', y='Count', 
  title='Top 50 First Names by Count (Descending)',
  labels={'First Name': 'First Name', 'Count': 'Count'},
  color_discrete_sequence=['#636EFA'])

# Update layout for better appearance
fig.update_layout(
  xaxis_title='First Name',
  yaxis_title='Count',
  showlegend=False
)

# Show the figure
fig.show()