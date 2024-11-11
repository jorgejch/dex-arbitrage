from graphviz import Digraph

# Create a directed graph
diagram = Digraph(format="svg")
diagram.attr(rankdir="TB", size="10,10")

# Define nodes
diagram.node("PythonController", "Python Controller\n(Continuous Opportunity Scan)", shape="box", style="filled", fillcolor="lightblue")
diagram.node("ExecutionEngine", "Execution & Monitoring Engine", shape="box", style="filled", fillcolor="lightblue")
diagram.node("FlashLoanProvider", "Flash Loan Provider\n(Lending Pool)", shape="box", style="filled", fillcolor="lightyellow")
diagram.node("SmartContract", "Smart Contract\n(Deployed on BSC)", shape="box", style="filled", fillcolor="lightgreen")
diagram.node("DataSources", "Data Sources\n(DEX APIs, etc.)", shape="box", style="filled", fillcolor="lightyellow")
diagram.node("ProfitCollection", "Profit Collection\n(Funds Returned to Wallet)", shape="box", style="filled", fillcolor="lightcoral")
diagram.node("Wallet", "Wallet\n(For Funding & Transaction Signing)", shape="box", style="filled", fillcolor="lightyellow")

# Define edges
diagram.edge("PythonController", "ExecutionEngine")
diagram.edge("PythonController", "DataSources")
diagram.edge("ExecutionEngine", "FlashLoanProvider")
diagram.edge("ExecutionEngine", "SmartContract")
diagram.edge("FlashLoanProvider", "SmartContract")
diagram.edge("SmartContract", "ProfitCollection")
diagram.edge("ProfitCollection", "Wallet")

# Render and save
diagram_path = "./system_overview.svg"
diagram.render(diagram_path)