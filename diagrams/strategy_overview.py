from graphviz import Digraph

# Create a directed graph for the arbitrage strategy
diagram = Digraph(format="svg")
diagram.attr(rankdir="TB", size="10,10")

# Define nodes
diagram.node(
    "Start",
    "Start Opportunity Scan",
    shape="ellipse",
    style="filled",
    fillcolor="lightgrey",
)
diagram.node(
    "FetchPrices",
    "Fetch Token Prices\nfrom PancakeSwap API",
    shape="box",
    style="filled",
    fillcolor="lightblue",
)
diagram.node(
    "IdentifyOpportunity",
    "Identify Arbitrage\nOpportunities",
    shape="diamond",
    style="filled",
    fillcolor="lightyellow",
)
diagram.node(
    "InitiateFlashLoan",
    "Initiate Flash Loan\nfrom AAVE",
    shape="box",
    style="filled",
    fillcolor="lightgreen",
)
diagram.node(
    "FirstSwap",
    "Swap Token A to Token B\non PancakeSwap",
    shape="box",
    style="filled",
    fillcolor="lightblue",
)
diagram.node(
    "SecondSwap",
    "Swap Token B to Token A\non PancakeSwap",
    shape="box",
    style="filled",
    fillcolor="lightblue",
)
diagram.node(
    "RepayLoan",
    "Repay Flash Loan\nand Retain Profit",
    shape="box",
    style="filled",
    fillcolor="lightgreen",
)
diagram.node(
    "End", "End Process", shape="ellipse", style="filled", fillcolor="lightgrey"
)

# Define edges
diagram.edge("Start", "FetchPrices")
diagram.edge("FetchPrices", "IdentifyOpportunity")
diagram.edge(
    "IdentifyOpportunity", "InitiateFlashLoan", label="Profitable", style="solid"
)
diagram.edge("IdentifyOpportunity", "End", label="Not Profitable", style="dashed")
diagram.edge("InitiateFlashLoan", "FirstSwap")
diagram.edge("FirstSwap", "SecondSwap")
diagram.edge("SecondSwap", "RepayLoan")
diagram.edge("RepayLoan", "End")

# Render and save the diagram
file_path = "diagrams/strategy_overview.digraph"
diagram.render(file_path)
