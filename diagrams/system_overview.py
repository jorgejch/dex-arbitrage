from graphviz import Digraph

# Create a directed graph
diagram = Digraph(format="svg")
diagram.attr(rankdir="TB", size="10,10")

# Define nodes
diagram.node("PythonController", "Python Controller\n(Continuous Opportunity Scan)", shape="box", style="filled", fillcolor="lightblue")
diagram.node("SmartContracts", "Smart Contracts", shape="box", style="filled", fillcolor="lightgreen")
diagram.node("DataSources", "Data Sources\n(DEX APIs, etc.)", shape="box", style="filled", fillcolor="lightblue")
diagram.node("DEXA", "DEX A", shape="box", style="filled", fillcolor="lightyellow")
diagram.node("DEXB", "DEX B", shape="box", style="filled", fillcolor="lightyellow")
diagram.node("FlashLoanProvider", "Flash Loan Provider\n(Lending Pool)", shape="box", style="filled", fillcolor="lightyellow")

# Define edges
diagram.edge("PythonController", "SmartContracts")
diagram.edge("PythonController", "DataSources")
diagram.edge("SmartContracts", "FlashLoanProvider")
diagram.edge("SmartContracts", "DEXA")
diagram.edge("SmartContracts", "DEXB")

# Render and save
diagram_path = "diagrams/system_overview.digraph"
diagram.render(diagram_path)