from setuptools import setup, find_packages

setup(
    name="dex-arbitrage",
    version="0.1.0",
    packages=find_packages(),
    install_requires=[
        "eth-ape",
        "graphviz",
    ],
    entry_points={
        "console_scripts": [
            "deploy=deploy:main",
        ],
    },
    classifiers=[
        "Programming Language :: Python :: 3",
        "License :: OSI Approved :: MIT License",
        "Operating System :: OS Independent",
    ],
    python_requires='>=3.12,<3.13',
)