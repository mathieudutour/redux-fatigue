BABEL_FLAGS=index.js

SERVER_FLAGS ?= -p 3000 example

include node_modules/@mathieudutour/js-fatigue/Makefile

serve:
	@echo "  $(P) serve $(SERVER_FLAGS)"
	@$(BIN_DIR)/ecstatic $(SERVER_FLAGS)
