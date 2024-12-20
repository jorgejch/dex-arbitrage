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
    "Fetch Token Prices\nfrom Uniswap API",
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
    "Swap Token A to Token B\non Uniswap",
    shape="box",
    style="filled",
    fillcolor="lightblue",
)
diagram.node(
    "SecondSwap",
    "Swap Token B to Token C\non Uniswap",
    shape="box",
    style="filled",
    fillcolor="lightblue",
)
diagram.node(
    "ThirdSwap",
    "Swap Token C to Token A\non Uniswap",
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
diagram.edge("SecondSwap", "ThirdSwap")
diagram.edge("ThirdSwap", "RepayLoan")
diagram.edge("RepayLoan", "End")

# Render and save the diagram
file_path = "diagrams/strategy_overview.digraph"
diagram.render(file_path)
