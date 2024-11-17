from graphviz import Digraph

# Create a directed graph
diagram = Digraph(format="svg")
diagram.attr(rankdir="TB", size="10,10")

# Define nodes
diagram.node("Controller", "Controller\n(Continuous Opportunity Scan)", shape="box", style="filled", fillcolor="lightblue")
diagram.node("SmartContracts", "Smart Contracts", shape="box", style="filled", fillcolor="lightgreen")
diagram.node("DataSources", "Data Sources\n(DEX APIs, etc.)", shape="box", style="filled", fillcolor="lightblue")
diagram.node("DEX", "DEX", shape="box", style="filled", fillcolor="lightyellow")
diagram.node("FlashLoanProvider", "Flash Loan Provider\n(Lending Pool)", shape="box", style="filled", fillcolor="lightyellow")

# Define edges
diagram.edge("Controller", "SmartContracts")
diagram.edge("Controller", "DataSources")
diagram.edge("SmartContracts", "FlashLoanProvider")
diagram.edge("SmartContracts", "DEX")

# Render and save
diagram_path = "diagrams/system_overview.digraph"
diagram.render(diagram_path)